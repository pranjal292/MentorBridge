const express = require('express');
const auth = require('../middleware/auth');
const { decrypt, queryOne, queryAll } = require('../db');

const router = express.Router();

let genAI = null;
try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
        genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }
} catch (e) {
    console.log('Gemini AI not available, using mock data');
}

function tokenize(text) {
    if (!text) return [];
    return String(text).toLowerCase()
        .split(/[,;|\s]+/)
        .map(w => w.replace(/[^a-z0-9#+.]/g, ''))
        .filter(w => w.length > 1);
}

function getSmartMockMatches(studentData, mentors) {
    const studentTokens = [
        ...tokenize(studentData.skills),
        ...tokenize(studentData.interests),
        ...tokenize(studentData.goals),
        ...tokenize(studentData.bio)
    ];

    const scored = mentors.map(m => {
        const mentorTokens = [
            ...tokenize(m.expertise),
            ...tokenize(m.bio),
            ...tokenize(m.title),
            ...tokenize(m.company)
        ];

        // Count keyword overlaps
        const matchedKeywords = new Set();
        for (const st of studentTokens) {
            for (const mt of mentorTokens) {
                if (st === mt || mt.includes(st) || st.includes(mt)) {
                    matchedKeywords.add(st);
                }
            }
        }

        const overlapCount = matchedKeywords.size;
        const maxPossible = Math.max(new Set(studentTokens).size, 1);
        const rawScore = Math.min(overlapCount / maxPossible, 1);
        const compatibility = Math.round(40 + rawScore * 57); // 40-97 range

        const matchedArr = [...matchedKeywords].slice(0, 4);
        const reason = matchedArr.length > 0
            ? `Matches your profile in: ${matchedArr.join(', ')}. Their expertise in ${m.expertise || m.title || 'their field'} aligns with your goals.`
            : `Experienced professional in ${m.expertise || m.title || 'their field'} who could broaden your perspective.`;

        return {
            mentor_id: m.id,
            name: m.name,
            title: m.title,
            company: m.company,
            expertise: m.expertise,
            bio: m.bio,
            avgRating: m.avgRating,
            totalReviews: m.totalReviews,
            compatibility,
            reason
        };
    });

    scored.sort((a, b) => b.compatibility - a.compatibility);
    return scored;
}

const ROLE_ROADMAPS = {
    'penetration tester': {
        estimatedDuration: '8-14 months',
        phases: [
            { phase: 1, title: 'Networking & Linux Foundations', duration: '2 months', description: 'Master TCP/IP, OSI model, subnetting, DNS, HTTP/HTTPS protocols. Get comfortable with Linux command line, shell scripting, and system administration.', skills: ['TCP/IP Networking', 'Linux Administration', 'Bash Scripting', 'Wireshark Packet Analysis'], tools: ['Kali Linux', 'Wireshark', 'Nmap', 'Netcat'], projects: ['Set up a home lab with VirtualBox and multiple VMs', 'Capture and analyze network traffic from a simulated attack'] },
            { phase: 2, title: 'Web Application Security', duration: '2-3 months', description: 'Learn OWASP Top 10 vulnerabilities hands-on. Practice SQL injection, XSS, CSRF, SSRF, authentication bypass, and file upload vulnerabilities.', skills: ['SQL Injection', 'Cross-Site Scripting (XSS)', 'CSRF Attacks', 'Authentication Bypass', 'API Security Testing'], tools: ['Burp Suite', 'OWASP ZAP', 'SQLMap', 'Postman', 'Nikto'], projects: ['Hack every level of DVWA (Damn Vulnerable Web App)', 'Complete PortSwigger Web Security Academy labs'] },
            { phase: 3, title: 'System & Network Exploitation', duration: '2-3 months', description: 'Exploit buffer overflows, privilege escalation, pivoting, and lateral movement. Learn to use and write Metasploit modules.', skills: ['Buffer Overflow Exploits', 'Privilege Escalation (Linux & Windows)', 'Active Directory Attacks', 'Post-Exploitation'], tools: ['Metasploit Framework', 'Cobalt Strike', 'Mimikatz', 'Bloodhound', 'Hashcat'], projects: ['Root 20+ machines on HackTheBox', 'Build a custom reverse shell payload'] },
            { phase: 4, title: 'Reporting & Methodology', duration: '1-2 months', description: 'Master professional pentest report writing, PTES/OWASP methodology, risk scoring (CVSS), and client communication.', skills: ['Pentest Report Writing', 'CVSS Scoring', 'PTES Methodology', 'Risk Assessment'], tools: ['Dradis', 'Ghostwriter', 'CherryTree', 'LaTeX'], projects: ['Write a full pentest report for a practice engagement', 'Create a reusable pentest checklist and template'] },
            { phase: 5, title: 'Certification & Career Launch', duration: '2-3 months', description: 'Pursue OSCP or CompTIA PenTest+ certification. Build your professional brand and prepare for interviews with CTF competitions.', skills: ['OSCP Exam Preparation', 'CTF Competitions', 'Bug Bounty Hunting', 'Interview Preparation'], tools: ['Offensive Security PWK Labs', 'TryHackMe', 'HackerOne', 'Bugcrowd'], projects: ['Earn OSCP certification', 'Find and responsibly disclose a real-world vulnerability'] }
        ]
    },
    'frontend developer': {
        estimatedDuration: '6-10 months',
        phases: [
            { phase: 1, title: 'HTML, CSS & JavaScript Mastery', duration: '2 months', description: 'Master semantic HTML5, CSS Grid/Flexbox, responsive design, CSS animations, and core JavaScript (ES6+, DOM manipulation, async/await).', skills: ['Semantic HTML5', 'CSS Grid & Flexbox', 'Responsive Design', 'JavaScript ES6+', 'DOM Manipulation'], tools: ['VS Code', 'Chrome DevTools', 'CodePen', 'MDN Web Docs'], projects: ['Build a responsive portfolio website from scratch', 'Create an interactive weather app using a public API'] },
            { phase: 2, title: 'React Ecosystem', duration: '2-3 months', description: 'Learn React fundamentals, hooks, state management, routing. Build component libraries and understand the virtual DOM.', skills: ['React Hooks & Context', 'React Router', 'State Management (Zustand/Redux)', 'Component Design Patterns'], tools: ['React', 'Next.js', 'Vite', 'React DevTools', 'Storybook'], projects: ['Build a full e-commerce storefront with cart functionality', 'Create a reusable UI component library with Storybook'] },
            { phase: 3, title: 'Advanced Frontend & Performance', duration: '1-2 months', description: 'Master TypeScript, testing, performance optimization, accessibility (WCAG), and SEO best practices.', skills: ['TypeScript', 'Unit & Integration Testing', 'Web Accessibility (WCAG 2.1)', 'Core Web Vitals Optimization'], tools: ['TypeScript', 'Jest', 'React Testing Library', 'Lighthouse', 'Axe DevTools'], projects: ['Migrate a JavaScript project to TypeScript', 'Achieve 100/100 Lighthouse score on a real project'] },
            { phase: 4, title: 'Design Systems & Animation', duration: '1-2 months', description: 'Learn design principles, create and maintain design systems, master CSS-in-JS and animation libraries.', skills: ['Design System Architecture', 'Motion Design', 'Figma-to-Code Workflow', 'CSS-in-JS'], tools: ['Figma', 'Framer Motion', 'Tailwind CSS', 'Styled Components'], projects: ['Build a complete design system with tokens, components, and documentation', 'Create an animated landing page with scroll-triggered animations'] },
            { phase: 5, title: 'Career Preparation', duration: '1-2 months', description: 'Polish your portfolio, practice machine coding rounds, DSA for interviews, and contribute to open source.', skills: ['Machine Coding Round Prep', 'System Design for Frontend', 'Portfolio Optimization', 'Open Source Contribution'], tools: ['GitHub', 'Vercel', 'Netlify', 'LeetCode'], projects: ['Deploy 3 polished projects with case studies', 'Contribute to a popular open-source React library'] }
        ]
    },
    'backend developer': {
        estimatedDuration: '7-12 months',
        phases: [
            { phase: 1, title: 'Programming & Database Fundamentals', duration: '2 months', description: 'Master a server-side language (Node.js/Python/Java), SQL databases, and basic data structures & algorithms.', skills: ['Node.js or Python', 'SQL (PostgreSQL/MySQL)', 'RESTful API Design', 'Data Structures & Algorithms'], tools: ['Node.js', 'PostgreSQL', 'Postman', 'pgAdmin'], projects: ['Build a REST API for a blog platform with CRUD operations', 'Implement authentication with JWT and bcrypt'] },
            { phase: 2, title: 'Advanced APIs & Architecture', duration: '2-3 months', description: 'Learn API design patterns, microservices architecture, message queues, caching, and GraphQL.', skills: ['Microservices Architecture', 'GraphQL', 'Message Queues (RabbitMQ/Kafka)', 'Caching Strategies (Redis)'], tools: ['Express.js/FastAPI', 'Redis', 'RabbitMQ', 'GraphQL (Apollo)', 'Swagger/OpenAPI'], projects: ['Build a real-time notification system with WebSockets', 'Design a microservices-based e-commerce backend'] },
            { phase: 3, title: 'Database Mastery & DevOps Basics', duration: '1-2 months', description: 'NoSQL databases, query optimization, database sharding/replication, Docker containerization, and CI/CD pipelines.', skills: ['MongoDB/DynamoDB', 'Query Optimization & Indexing', 'Docker & Containerization', 'CI/CD Pipelines'], tools: ['MongoDB', 'Docker', 'GitHub Actions', 'AWS RDS', 'Prisma/Sequelize'], projects: ['Containerize an application with Docker Compose', 'Set up automated testing and deployment pipeline'] },
            { phase: 4, title: 'System Design & Scalability', duration: '2-3 months', description: 'Design scalable distributed systems, load balancing, CDN, rate limiting, and production monitoring.', skills: ['System Design', 'Load Balancing', 'Rate Limiting', 'Logging & Monitoring', 'Security Best Practices'], tools: ['Nginx', 'Prometheus', 'Grafana', 'ELK Stack', 'AWS/GCP Services'], projects: ['Design and implement a URL shortener that handles millions of requests', 'Build a real-time analytics dashboard'] },
            { phase: 5, title: 'Interview & Career Launch', duration: '1-2 months', description: 'Practice system design interviews, DSA problems, and build your professional brand.', skills: ['System Design Interviews', 'LeetCode Medium/Hard', 'Behavioral Interview Prep', 'Technical Writing'], tools: ['LeetCode', 'System Design Primer', 'Grokking System Design', 'LinkedIn'], projects: ['Write technical blog posts about your architecture decisions', 'Complete 150+ LeetCode problems'] }
        ]
    },
    'ml engineer': {
        estimatedDuration: '9-15 months',
        phases: [
            { phase: 1, title: 'Math & Python for ML', duration: '2-3 months', description: 'Master linear algebra, probability, statistics, and Python scientific computing stack.', skills: ['Linear Algebra', 'Probability & Statistics', 'Python Scientific Computing', 'Data Visualization'], tools: ['NumPy', 'Pandas', 'Matplotlib', 'Seaborn', 'Jupyter Notebooks'], projects: ['Implement matrix operations and gradient descent from scratch', 'Exploratory data analysis on a Kaggle dataset'] },
            { phase: 2, title: 'Classical ML', duration: '2-3 months', description: 'Learn supervised and unsupervised learning algorithms, feature engineering, model evaluation, and hyperparameter tuning.', skills: ['Regression & Classification', 'Clustering & Dimensionality Reduction', 'Feature Engineering', 'Cross-Validation & Metrics'], tools: ['Scikit-learn', 'XGBoost', 'LightGBM', 'Optuna', 'MLflow'], projects: ['Build an end-to-end house price prediction pipeline', 'Customer segmentation using K-Means and PCA'] },
            { phase: 3, title: 'Deep Learning', duration: '2-3 months', description: 'CNNs for vision, RNNs/Transformers for NLP, transfer learning, and model fine-tuning.', skills: ['Neural Networks', 'CNNs & Image Classification', 'Transformers & Attention', 'Transfer Learning'], tools: ['PyTorch', 'TensorFlow', 'Hugging Face Transformers', 'Weights & Biases'], projects: ['Fine-tune a vision model for medical image classification', 'Build a text summarizer using a pre-trained Transformer'] },
            { phase: 4, title: 'MLOps & Deployment', duration: '2-3 months', description: 'ML pipelines, model serving, monitoring, A/B testing, and cloud deployment.', skills: ['ML Pipelines', 'Model Serving & APIs', 'Model Monitoring & Drift Detection', 'A/B Testing'], tools: ['Docker', 'Kubernetes', 'AWS SageMaker', 'FastAPI', 'BentoML'], projects: ['Deploy a model API with FastAPI + Docker on AWS', 'Build an automated retraining pipeline with MLflow'] },
            { phase: 5, title: 'Specialization & Research', duration: '2-3 months', description: 'Specialize in a domain (NLP, CV, RL) and read research papers. Prepare for ML-specific interviews.', skills: ['Research Paper Reading', 'LLM Fine-Tuning', 'ML System Design', 'Interview Preparation'], tools: ['arXiv', 'Papers With Code', 'Google Colab Pro', 'LangChain'], projects: ['Reproduce results from a recent ML research paper', 'Build an end-to-end RAG application with LLMs'] }
        ]
    },
    'devops engineer': {
        estimatedDuration: '8-12 months',
        phases: [
            { phase: 1, title: 'Linux & Scripting', duration: '1-2 months', description: 'Linux system administration, shell scripting (Bash/Python), networking fundamentals, and package management.', skills: ['Linux System Admin', 'Bash & Python Scripting', 'Networking (DNS, TCP/IP, HTTP)', 'SSH & Firewall Management'], tools: ['Ubuntu/CentOS', 'Bash', 'Python', 'systemd', 'iptables'], projects: ['Automate server provisioning with a Bash script', 'Set up a LAMP/LEMP stack from scratch on a VPS'] },
            { phase: 2, title: 'Containerization & Orchestration', duration: '2-3 months', description: 'Docker deep dive, Kubernetes fundamentals, Helm charts, and container security.', skills: ['Docker Containerization', 'Kubernetes (Pods, Services, Deployments)', 'Helm Charts', 'Container Security'], tools: ['Docker', 'Kubernetes (k3s/minikube)', 'Helm', 'Trivy', 'Docker Compose'], projects: ['Containerize a multi-service application', 'Deploy a microservices app on Kubernetes with Helm'] },
            { phase: 3, title: 'CI/CD & Infrastructure as Code', duration: '2 months', description: 'Build CI/CD pipelines, infrastructure as code with Terraform, and configuration management with Ansible.', skills: ['CI/CD Pipeline Design', 'Terraform (IaC)', 'Ansible Configuration Management', 'GitOps Workflow'], tools: ['GitHub Actions', 'Jenkins', 'Terraform', 'Ansible', 'ArgoCD'], projects: ['Build a full CI/CD pipeline from commit to production', 'Provision cloud infrastructure entirely with Terraform'] },
            { phase: 4, title: 'Cloud & Monitoring', duration: '2-3 months', description: 'AWS/GCP core services, monitoring stack, log aggregation, alerting, and incident response.', skills: ['AWS Core Services (EC2, S3, RDS, Lambda)', 'Monitoring & Alerting', 'Log Aggregation', 'Incident Response'], tools: ['AWS/GCP Console', 'Prometheus', 'Grafana', 'ELK Stack', 'PagerDuty'], projects: ['Set up monitoring and alerting for a production application', 'Build a centralized logging system with ELK'] },
            { phase: 5, title: 'SRE Practices & Certification', duration: '1-2 months', description: 'SRE principles, chaos engineering, capacity planning, and certifications (CKA, AWS SAA).', skills: ['SRE Principles & SLOs', 'Chaos Engineering', 'Capacity Planning', 'Cost Optimization'], tools: ['Chaos Monkey', 'Litmus', 'AWS Cost Explorer', 'Terraform Cloud'], projects: ['Implement chaos engineering experiments on a staging environment', 'Earn CKA or AWS Solutions Architect certification'] }
        ]
    },
    'data engineer': {
        estimatedDuration: '8-14 months',
        phases: [
            { phase: 1, title: 'SQL & Python for Data', duration: '2 months', description: 'Advanced SQL (window functions, CTEs, optimization), Python data processing, and data modeling fundamentals.', skills: ['Advanced SQL', 'Python Data Processing', 'Data Modeling (Star/Snowflake Schema)', 'ETL Concepts'], tools: ['PostgreSQL', 'Python', 'Pandas', 'dbt', 'pgAdmin'], projects: ['Design a star schema for an e-commerce analytics database', 'Build an ETL pipeline to load CSV data into a normalized database'] },
            { phase: 2, title: 'Big Data Processing', duration: '2-3 months', description: 'Apache Spark, distributed computing, batch vs stream processing, and data lake architecture.', skills: ['Apache Spark (PySpark)', 'Distributed Computing', 'Batch Processing', 'Data Lake Architecture'], tools: ['Apache Spark', 'Databricks', 'Hadoop HDFS', 'Apache Parquet', 'Delta Lake'], projects: ['Process a 10GB dataset using PySpark', 'Build a data lake on S3 with partitioned Parquet files'] },
            { phase: 3, title: 'Streaming & Orchestration', duration: '2-3 months', description: 'Real-time streaming with Kafka, workflow orchestration with Airflow, and event-driven architectures.', skills: ['Apache Kafka', 'Apache Airflow', 'Stream Processing', 'Event-Driven Architecture'], tools: ['Apache Kafka', 'Apache Airflow', 'Apache Flink', 'Debezium', 'Prefect'], projects: ['Build a real-time clickstream analytics pipeline', 'Orchestrate a multi-step data pipeline with Airflow'] },
            { phase: 4, title: 'Cloud Data Platforms', duration: '2-3 months', description: 'Cloud data warehouses, serverless data pipelines, data governance, and cost optimization.', skills: ['Cloud Data Warehousing', 'Serverless Pipelines', 'Data Governance & Quality', 'Cost Optimization'], tools: ['Snowflake', 'AWS Glue', 'BigQuery', 'Great Expectations', 'dbt Cloud'], projects: ['Migrate an on-premise data pipeline to cloud-native architecture', 'Implement data quality checks with Great Expectations'] },
            { phase: 5, title: 'Interview Prep & Portfolio', duration: '1-2 months', description: 'System design for data, SQL interview prep, and building your data engineering portfolio.', skills: ['Data System Design', 'SQL Interview Problems', 'Technical Communication', 'Portfolio Building'], tools: ['LeetCode (SQL/Database)', 'GitHub', 'Medium/Dev.to', 'LinkedIn'], projects: ['Design a scalable data pipeline architecture for a case study', 'Write technical blog posts about your data engineering projects'] }
        ]
    },
    'mobile developer': {
        estimatedDuration: '6-10 months',
        phases: [
            { phase: 1, title: 'Programming & UI Basics', duration: '2 months', description: 'Learn Dart/Kotlin/Swift, understand mobile UI patterns, gestures, and platform-specific design guidelines.', skills: ['Dart or Kotlin or Swift', 'Mobile UI Patterns', 'Material Design / Human Interface Guidelines', 'State Management Basics'], tools: ['Flutter', 'Android Studio', 'Xcode', 'VS Code'], projects: ['Build a calculator app with proper UI/UX', 'Create a todo app with local storage'] },
            { phase: 2, title: 'Flutter/React Native Deep Dive', duration: '2-3 months', description: 'Master widgets, navigation, state management (Riverpod/Provider/Redux), and platform channels.', skills: ['Widget Composition', 'Navigation & Routing', 'State Management (Riverpod/Provider)', 'Platform Channels'], tools: ['Flutter', 'Riverpod/Provider', 'GoRouter', 'Flutter DevTools'], projects: ['Build a recipes app with API integration and caching', 'Create a real-time chat app with Firebase'] },
            { phase: 3, title: 'APIs, Storage & Auth', duration: '1-2 months', description: 'REST/GraphQL integration, local databases (SQLite/Hive), authentication flows, and push notifications.', skills: ['REST & GraphQL APIs', 'Local Database (SQLite/Hive)', 'Firebase Auth & Firestore', 'Push Notifications'], tools: ['Dio/Retrofit', 'Hive/SQLite', 'Firebase', 'OneSignal'], projects: ['Build a social media app with user profiles and feeds', 'Implement offline-first architecture with sync'] },
            { phase: 4, title: 'Publishing & Advanced Features', duration: '1-2 months', description: 'App store deployment, CI/CD for mobile, animations, performance profiling, and accessibility.', skills: ['App Store & Play Store Publishing', 'CI/CD for Mobile (Codemagic/Fastlane)', 'Custom Animations', 'Performance Profiling'], tools: ['Fastlane', 'Codemagic', 'App Store Connect', 'Google Play Console'], projects: ['Publish an app to both app stores', 'Implement complex animations (hero, page transitions)'] },
            { phase: 5, title: 'Career & Portfolio', duration: '1 month', description: 'Build a portfolio of 3+ polished apps, contribute to Flutter/RN community, and prepare for mobile dev interviews.', skills: ['Mobile System Design', 'Interview Preparation', 'Open Source Contribution', 'Technical Writing'], tools: ['GitHub', 'Figma', 'Notion', 'LeetCode'], projects: ['Build a portfolio showcasing 3 complete, polished apps', 'Write a technical article about a mobile architecture pattern'] }
        ]
    },
    'cloud architect': {
        estimatedDuration: '10-16 months',
        phases: [
            { phase: 1, title: 'Cloud Fundamentals', duration: '2-3 months', description: 'Understand core cloud services (compute, storage, networking, IAM) across AWS/GCP/Azure.', skills: ['AWS EC2, S3, VPC, IAM', 'Cloud Networking (VPC, Subnets, Security Groups)', 'Identity & Access Management', 'Cloud Cost Management'], tools: ['AWS Console', 'AWS CLI', 'CloudFormation', 'AWS Pricing Calculator'], projects: ['Deploy a multi-tier web app on AWS with VPC, ALB, and RDS', 'Set up IAM roles and policies for a multi-team organization'] },
            { phase: 2, title: 'Infrastructure as Code', duration: '2-3 months', description: 'Terraform, CloudFormation, infrastructure automation, and multi-environment management.', skills: ['Terraform (Modules, State Management)', 'CloudFormation/CDK', 'Infrastructure Testing', 'Multi-Environment Strategy'], tools: ['Terraform', 'AWS CDK', 'Pulumi', 'Terratest', 'Checkov'], projects: ['Provision a complete production environment with Terraform modules', 'Implement infrastructure testing with Terratest'] },
            { phase: 3, title: 'Containers & Serverless', duration: '2-3 months', description: 'Container orchestration with EKS/ECS, serverless patterns with Lambda, event-driven architecture.', skills: ['EKS/ECS Container Orchestration', 'AWS Lambda & Step Functions', 'Event-Driven Architecture', 'API Gateway Patterns'], tools: ['AWS EKS', 'AWS Lambda', 'API Gateway', 'Step Functions', 'EventBridge'], projects: ['Architect a serverless data processing pipeline', 'Migrate a monolith to containers on EKS'] },
            { phase: 4, title: 'Security & Compliance', duration: '2-3 months', description: 'Cloud security architecture, encryption, compliance frameworks (SOC2, HIPAA), and security automation.', skills: ['Cloud Security Architecture', 'Encryption at Rest & Transit', 'Compliance Frameworks (SOC2, HIPAA)', 'Security Automation'], tools: ['AWS GuardDuty', 'AWS Config', 'AWS WAF', 'CloudTrail', 'HashiCorp Vault'], projects: ['Design a HIPAA-compliant architecture on AWS', 'Implement automated security scanning in CI/CD'] },
            { phase: 5, title: 'Certification & Leadership', duration: '2-3 months', description: 'Pursue AWS Solutions Architect Professional certification and develop architecture review skills.', skills: ['Well-Architected Framework', 'Architecture Decision Records', 'Cost Optimization', 'Disaster Recovery Planning'], tools: ['AWS Well-Architected Tool', 'Lucidchart', 'draw.io', 'AWS Trusted Advisor'], projects: ['Earn AWS Solutions Architect Professional certification', 'Conduct a Well-Architected Review on a production workload'] }
        ]
    },
    'full stack developer': {
        estimatedDuration: '8-14 months',
        phases: [
            { phase: 1, title: 'Frontend Foundations', duration: '2 months', description: 'HTML5, CSS3 (Grid/Flexbox), JavaScript ES6+, responsive design, and React fundamentals.', skills: ['HTML5 & CSS3', 'JavaScript ES6+', 'React Fundamentals', 'Responsive Design'], tools: ['VS Code', 'React', 'Vite', 'Chrome DevTools', 'Figma'], projects: ['Build a responsive landing page with modern CSS', 'Create a React SPA with routing and state management'] },
            { phase: 2, title: 'Backend & Database', duration: '2-3 months', description: 'Node.js/Express REST APIs, PostgreSQL, MongoDB, authentication (JWT/OAuth), and API security.', skills: ['Node.js & Express', 'PostgreSQL & MongoDB', 'JWT Authentication', 'API Design & Security'], tools: ['Express.js', 'PostgreSQL', 'MongoDB', 'Prisma/Mongoose', 'Postman'], projects: ['Build a full REST API with auth, CRUD, and file uploads', 'Design and implement a normalized database schema'] },
            { phase: 3, title: 'Full Stack Integration', duration: '2-3 months', description: 'Connect frontend to backend, state management, real-time features (WebSockets), and testing.', skills: ['Full Stack Data Flow', 'WebSockets & Real-time', 'Testing (Unit, Integration, E2E)', 'Error Handling & Validation'], tools: ['Socket.io', 'Jest', 'Cypress', 'React Query/SWR', 'Zod'], projects: ['Build a real-time collaborative document editor', 'Create a social media platform with feeds, likes, and comments'] },
            { phase: 4, title: 'DevOps & Deployment', duration: '1-2 months', description: 'Docker, CI/CD pipelines, cloud deployment (AWS/Vercel), monitoring, and performance optimization.', skills: ['Docker & Docker Compose', 'CI/CD (GitHub Actions)', 'Cloud Deployment (AWS/Vercel/Railway)', 'Performance Monitoring'], tools: ['Docker', 'GitHub Actions', 'Vercel', 'AWS EC2/RDS', 'Sentry'], projects: ['Deploy a full stack app with Docker Compose on AWS', 'Set up automated testing and deployment pipeline'] },
            { phase: 5, title: 'Portfolio & Interviews', duration: '1-2 months', description: 'Build 3 showcase projects, practice system design, DSA, and full stack interview prep.', skills: ['System Design', 'DSA (LeetCode Medium)', 'Portfolio Building', 'Technical Communication'], tools: ['LeetCode', 'GitHub', 'Notion Portfolio', 'LinkedIn'], projects: ['Build and deploy a production-ready SaaS MVP', 'Write case studies for your top 3 projects'] }
        ]
    },
    'cybersecurity analyst': {
        estimatedDuration: '8-12 months',
        phases: [
            { phase: 1, title: 'Security Foundations', duration: '2 months', description: 'Networking protocols, CIA triad, threat landscape, common attack vectors, and security frameworks (NIST, ISO 27001).', skills: ['Network Security Fundamentals', 'CIA Triad & Risk Assessment', 'Security Frameworks (NIST, ISO 27001)', 'Common Attack Vectors'], tools: ['Wireshark', 'Nmap', 'Kali Linux', 'CyberChef'], projects: ['Analyze pcap files to identify malicious traffic', 'Map the MITRE ATT&CK framework to real-world incidents'] },
            { phase: 2, title: 'SIEM & Threat Detection', duration: '2-3 months', description: 'Log analysis, SIEM operations, creating detection rules, and understanding indicators of compromise (IOCs).', skills: ['SIEM Operations', 'Log Analysis & Correlation', 'Detection Rule Writing', 'IOC Analysis'], tools: ['Splunk', 'Elastic SIEM', 'Sigma Rules', 'YARA', 'VirusTotal'], projects: ['Build detection rules for 10 common attack techniques', 'Set up a Splunk lab and analyze Windows event logs'] },
            { phase: 3, title: 'Incident Response', duration: '2 months', description: 'Incident response lifecycle, digital forensics basics, malware analysis fundamentals, and containment strategies.', skills: ['Incident Response Lifecycle', 'Digital Forensics Basics', 'Malware Triage', 'Containment & Eradication'], tools: ['Volatility', 'Autopsy', 'FTK Imager', 'ANY.RUN', 'TheHive'], projects: ['Perform forensic analysis on a compromised disk image', 'Create an incident response playbook for ransomware'] },
            { phase: 4, title: 'Vulnerability Management', duration: '1-2 months', description: 'Vulnerability scanning, risk scoring, patch management, and security hardening.', skills: ['Vulnerability Assessment', 'CVSS Scoring', 'Patch Management', 'Security Hardening'], tools: ['Nessus', 'OpenVAS', 'Qualys', 'CIS Benchmarks'], projects: ['Perform a vulnerability assessment on a lab network', 'Create hardening guides for Linux and Windows servers'] },
            { phase: 5, title: 'Certification & Career', duration: '1-2 months', description: 'Pursue CompTIA Security+ or CySA+ certification, build your SOC analyst portfolio, and prepare for interviews.', skills: ['CompTIA Security+/CySA+ Prep', 'SOC Analyst Workflows', 'Threat Intelligence', 'Interview Preparation'], tools: ['TryHackMe SOC Path', 'LetsDefend', 'Blue Team Labs', 'LinkedIn'], projects: ['Earn CompTIA Security+ certification', 'Complete TryHackMe SOC Level 1 path'] }
        ]
    },
    'firmware engineer': {
        estimatedDuration: '10-16 months',
        phases: [
            { phase: 1, title: 'C/C++ & Hardware Basics', duration: '2-3 months', description: 'Master C programming for embedded systems, understand microcontroller architecture, memory management, and basic electronics.', skills: ['C Programming for Embedded', 'Microcontroller Architecture (ARM Cortex-M)', 'Memory Management', 'Basic Electronics & Digital Logic'], tools: ['GCC ARM Toolchain', 'STM32CubeIDE', 'Oscilloscope', 'Multimeter'], projects: ['Blink LEDs and read buttons on an STM32 board', 'Implement a UART-based serial communication system'] },
            { phase: 2, title: 'RTOS & Peripherals', duration: '2-3 months', description: 'Real-time operating systems (FreeRTOS), interrupt handling, I2C/SPI/UART protocols, timers, and ADC/DAC.', skills: ['FreeRTOS (Tasks, Queues, Semaphores)', 'Interrupt Handling', 'Communication Protocols (I2C, SPI, UART)', 'Timer & PWM Control'], tools: ['FreeRTOS', 'STM32 HAL', 'Logic Analyzer', 'Saleae', 'J-Link Debugger'], projects: ['Build a multi-tasking sensor data logger with FreeRTOS', 'Interface an I2C temperature sensor and SPI display'] },
            { phase: 3, title: 'Embedded Linux & Drivers', duration: '2-3 months', description: 'Linux kernel basics, device driver development, Yocto/Buildroot, and cross-compilation.', skills: ['Linux Kernel Basics', 'Device Driver Development', 'Cross-Compilation', 'Yocto/Buildroot'], tools: ['Yocto Project', 'Buildroot', 'QEMU', 'GDB', 'Device Tree'], projects: ['Write a character device driver for a custom peripheral', 'Build a custom Linux image with Yocto for a Raspberry Pi'] },
            { phase: 4, title: 'IoT & Connected Devices', duration: '2-3 months', description: 'IoT protocols (MQTT, CoAP), BLE/WiFi connectivity, OTA updates, and security for embedded systems.', skills: ['MQTT & CoAP Protocols', 'BLE & WiFi Connectivity', 'OTA Firmware Updates', 'Embedded Security (Secure Boot, TLS)'], tools: ['ESP-IDF', 'MQTT Broker (Mosquitto)', 'AWS IoT Core', 'nRF Connect', 'OpenSSL'], projects: ['Build an IoT sensor node that reports data to the cloud via MQTT', 'Implement secure OTA firmware update mechanism'] },
            { phase: 5, title: 'Product Development & Career', duration: '1-2 months', description: 'Firmware testing, debugging techniques, product certification, and interview preparation.', skills: ['Unit Testing for Embedded (Unity/CMock)', 'JTAG/SWD Debugging', 'EMC/EMI Compliance Basics', 'Technical Documentation'], tools: ['Unity Test Framework', 'CMock', 'JTAG Debugger', 'Doxygen'], projects: ['Create a test suite for a firmware project with 80%+ coverage', 'Build a portfolio of 3 firmware projects with documentation'] }
        ]
    }
};

const ROLE_KEYWORDS = {
    'penetration tester': ['pentest', 'pen test', 'penetration', 'ethical hack', 'red team', 'offensive security'],
    'frontend developer': ['frontend', 'front-end', 'front end', 'react', 'vue', 'angular', 'ui developer', 'web developer'],
    'backend developer': ['backend', 'back-end', 'back end', 'server-side', 'api developer'],
    'ml engineer': ['machine learning', 'ml ', 'deep learning', 'ai engineer', 'artificial intelligence', 'data scientist'],
    'devops engineer': ['devops', 'dev ops', 'site reliability', 'sre', 'platform engineer'],
    'data engineer': ['data engineer', 'data pipeline', 'big data', 'etl', 'data infrastructure'],
    'mobile developer': ['mobile', 'android', 'ios', 'flutter', 'react native', 'app developer'],
    'cloud architect': ['cloud architect', 'cloud engineer', 'solutions architect', 'aws architect'],
    'full stack developer': ['full stack', 'fullstack', 'full-stack', 'mern', 'mean'],
    'cybersecurity analyst': ['cybersecurity', 'cyber security', 'soc analyst', 'security analyst', 'blue team', 'security operations'],
    'firmware engineer': ['firmware', 'embedded', 'microcontroller', 'iot developer', 'hardware engineer']
};

function getMockRoadmap(role, duration) {
    const roleLower = role.toLowerCase().trim();

    // Direct match
    if (ROLE_ROADMAPS[roleLower]) {
        return adjustDuration({ role, ...ROLE_ROADMAPS[roleLower] }, duration);
    }

    // Keyword match
    for (const [key, keywords] of Object.entries(ROLE_KEYWORDS)) {
        if (keywords.some(kw => roleLower.includes(kw)) || roleLower.includes(key)) {
            return adjustDuration({ role, ...ROLE_ROADMAPS[key] }, duration);
        }
    }

    // Fuzzy: find the closest match based on shared words
    let bestMatch = null;
    let bestScore = 0;
    const roleWords = roleLower.split(/\s+/);

    for (const [key, keywords] of Object.entries(ROLE_KEYWORDS)) {
        let score = 0;
        for (const word of roleWords) {
            if (key.includes(word)) score += 2;
            if (keywords.some(kw => kw.includes(word))) score += 1;
        }
        if (score > bestScore) {
            bestScore = score;
            bestMatch = key;
        }
    }

    if (bestMatch && bestScore > 0) {
        return adjustDuration({ role, ...ROLE_ROADMAPS[bestMatch] }, duration);
    }

    // Ultimate fallback: full stack developer roadmap customized
    return adjustDuration({ role, ...ROLE_ROADMAPS['full stack developer'] }, duration);
}

function adjustDuration(roadmap, targetDuration) {
    if (!targetDuration) return roadmap;

    const durationMonths = parseInt(targetDuration);
    if (!durationMonths || durationMonths < 3) return roadmap;

    const durationLabels = {
        3: { total: '3 months', phases: ['2-3 weeks', '3-4 weeks', '2-3 weeks', '2-3 weeks', '1-2 weeks'] },
        6: { total: '6 months', phases: ['1 month', '1-2 months', '1-2 months', '1 month', '2-3 weeks'] },
        9: { total: '9 months', phases: ['1-2 months', '2 months', '2 months', '2 months', '1-2 months'] },
        12: { total: '12 months', phases: ['2-3 months', '2-3 months', '2-3 months', '2 months', '1-2 months'] },
        18: { total: '18 months', phases: ['3-4 months', '3-4 months', '3-4 months', '3 months', '2-3 months'] },
        24: { total: '24 months', phases: ['4-5 months', '4-5 months', '4-5 months', '4 months', '3-4 months'] }
    };

    // Find closest duration key
    const keys = Object.keys(durationLabels).map(Number);
    const closest = keys.reduce((prev, curr) => Math.abs(curr - durationMonths) < Math.abs(prev - durationMonths) ? curr : prev);
    const labels = durationLabels[closest];

    return {
        ...roadmap,
        estimatedDuration: labels.total,
        phases: roadmap.phases.map((p, i) => ({ ...p, duration: labels.phases[i] || p.duration }))
    };
}

// GET /api/ai/match
router.get('/match', auth, async (req, res) => {
    try {
        if (req.user.role !== 'STUDENT') {
            return res.status(403).json({ error: 'Only students can use the matcher' });
        }

        const student = queryOne('SELECT skills, interests, goals, bio FROM student_profiles WHERE user_id = ?', [req.user.id]);
        if (!student) return res.status(404).json({ error: 'Student profile not found' });

        const studentData = {
            skills: decrypt(student.skills),
            interests: decrypt(student.interests),
            goals: decrypt(student.goals),
            bio: decrypt(student.bio)
        };

        const mentors = queryAll(`
      SELECT u.id, u.name, mp.title, mp.company, mp.expertise, mp.bio, mp.years_exp,
             AVG(r.rating) as avgRating, COUNT(r.id) as totalReviews
      FROM users u 
      JOIN mentor_profiles mp ON u.id = mp.user_id
      LEFT JOIN reviews r ON u.id = r.reviewee_id
      WHERE u.role = 'MENTOR'
      GROUP BY u.id
    `).map(m => ({
            ...m,
            name: decrypt(m.name), title: decrypt(m.title), company: decrypt(m.company),
            expertise: decrypt(m.expertise), bio: decrypt(m.bio),
            avgRating: Math.round((m.avgRating || 0) * 10) / 10,
            totalReviews: m.totalReviews || 0
        }));

        if (mentors.length === 0) return res.json([]);

        if (genAI) {
            try {
                const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
                const prompt = `You are a career mentorship matching AI. Given a student's profile and a list of available mentors, rank the mentors by compatibility.

STUDENT PROFILE:
- Skills: ${studentData.skills}
- Interests: ${studentData.interests}
- Goals: ${studentData.goals}
- Bio: ${studentData.bio}

AVAILABLE MENTORS:
${mentors.map((m, i) => `${i + 1}. ID: ${m.id}, Name: ${m.name}, Title: ${m.title}, Company: ${m.company}, Expertise: ${m.expertise}, Bio: ${m.bio}, Years Experience: ${m.years_exp}, Rating: ${m.avgRating} (${m.totalReviews} reviews)`).join('\n')}

Return a JSON array (no markdown, no code blocks, just raw JSON) ranking mentors by compatibility. Each element:
{
  "mentor_id": <number>,
  "compatibility": <number 0-100>,
  "reason": "<one-sentence explanation>"
}

Consider skill overlap, career goal alignment, and how the mentor's expertise can guide the student. Be specific about WHY each match is good.`;

                const result = await model.generateContent(prompt);
                const text = result.response.text().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                const matches = JSON.parse(text);

                const enrichedMatches = matches.map(match => {
                    const mentor = mentors.find(m => m.id === match.mentor_id);
                    return {
                        ...match,
                        name: mentor?.name,
                        title: mentor?.title,
                        company: mentor?.company,
                        expertise: mentor?.expertise,
                        bio: mentor?.bio,
                        avgRating: mentor?.avgRating || 0,
                        totalReviews: mentor?.totalReviews || 0
                    };
                });

                return res.json(enrichedMatches);
            } catch (aiErr) {
                console.error('Gemini AI error, falling back to mock:', aiErr.message);
            }
        }

        res.json(getSmartMockMatches(studentData, mentors));
    } catch (err) {
        console.error('Match error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/ai/roadmap
router.post('/roadmap', auth, async (req, res) => {
    try {
        const { role, duration } = req.body;
        if (!role) return res.status(400).json({ error: 'Role/career path is required' });

        let studentData = {};
        if (req.user.role === 'STUDENT') {
            const student = queryOne('SELECT * FROM student_profiles WHERE user_id = ?', [req.user.id]);
            if (student) {
                studentData = { skills: decrypt(student.skills), interests: decrypt(student.interests), goals: decrypt(student.goals) };
            }
        }

        if (genAI) {
            try {
                const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
                const durationHint = duration ? `The total roadmap should fit within approximately ${duration} months.` : '';
                const prompt = `You are a career roadmap generator. Create a detailed, structured career roadmap for someone who wants to become a "${role}".
${durationHint}

${studentData.skills ? `The student currently knows: ${studentData.skills}` : ''}
${studentData.interests ? `Their interests include: ${studentData.interests}` : ''}
${studentData.goals ? `Their goals: ${studentData.goals}` : ''}

Return a JSON object (no markdown, no code blocks, just raw JSON) with this structure:
{
  "role": "${role}",
  "estimatedDuration": "<e.g. 6-12 months>",
  "phases": [
    {
      "phase": 1,
      "title": "<phase name>",
      "duration": "<e.g. 1-2 months>",
      "description": "<what this phase covers>",
      "skills": ["<specific skill 1>", "<specific skill 2>"],
      "tools": ["<specific tool/technology 1>", "<specific tool 2>"],
      "projects": ["<hands-on project idea 1>", "<project 2>"]
    }
  ]
}

Create exactly 5 phases. Be VERY SPECIFIC with tool names (e.g., "Nmap" not "networking tools"), language names, and certifications. Tailor the roadmap to realistic career progression.`;

                const result = await model.generateContent(prompt);
                const text = result.response.text().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                const roadmap = JSON.parse(text);
                return res.json(roadmap);
            } catch (aiErr) {
                console.error('Gemini roadmap error, falling back to mock:', aiErr.message);
            }
        }

        res.json(getMockRoadmap(role, duration));
    } catch (err) {
        console.error('Roadmap error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/ai/heatmap - Industry demand heatmap data
router.get('/heatmap', auth, async (req, res) => {
    try {
        let studentData = {};
        if (req.user.role === 'STUDENT') {
            const student = queryOne('SELECT * FROM student_profiles WHERE user_id = ?', [req.user.id]);
            if (student) {
                studentData = { skills: decrypt(student.skills), interests: decrypt(student.interests), goals: decrypt(student.goals) };
            }
        }

        if (genAI) {
            try {
                const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
                const prompt = `You are a tech industry analyst. Generate a JSON object with industry demand data for tech skills right now (2025).

${studentData.interests ? `The user is interested in: ${studentData.interests}` : ''}
${studentData.goals ? `Their career goals: ${studentData.goals}` : ''}

Return a JSON object (no markdown, no code blocks, just raw JSON):
{
  "categories": [
    {
      "name": "<category name like AI/ML, Cloud, Cybersecurity, etc>",
      "skills": [
        { "name": "<specific skill>", "demand": <1-100 demand score>, "growth": "<percentage like +25%>", "avgSalary": "<e.g. $130K>", "openings": "<e.g. 45K+>" }
      ]
    }
  ],
  "topTrending": ["<skill1>", "<skill2>", "<skill3>", "<skill4>", "<skill5>"],
  "emergingSkills": ["<skill1>", "<skill2>", "<skill3>"]
}

Include 6 categories with 4-5 skills each. Make the data realistic for 2025 tech market. Include categories like AI/ML, Cloud & DevOps, Cybersecurity, Web Development, Data Engineering, and Mobile Development.`;

                const result = await model.generateContent(prompt);
                const text = result.response.text().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                const heatmap = JSON.parse(text);
                return res.json(heatmap);
            } catch (aiErr) {
                console.error('Gemini heatmap error, falling back to mock:', aiErr.message);
            }
        }

        // Mock heatmap data
        res.json({
            categories: [
                {
                    name: 'AI & Machine Learning',
                    skills: [
                        { name: 'LLM/GenAI', demand: 97, growth: '+42%', avgSalary: '$155K', openings: '62K+' },
                        { name: 'PyTorch', demand: 89, growth: '+28%', avgSalary: '$145K', openings: '38K+' },
                        { name: 'MLOps', demand: 85, growth: '+35%', avgSalary: '$140K', openings: '25K+' },
                        { name: 'Computer Vision', demand: 78, growth: '+20%', avgSalary: '$138K', openings: '18K+' },
                        { name: 'NLP', demand: 82, growth: '+24%', avgSalary: '$142K', openings: '22K+' }
                    ]
                },
                {
                    name: 'Cloud & DevOps',
                    skills: [
                        { name: 'Kubernetes', demand: 92, growth: '+30%', avgSalary: '$148K', openings: '55K+' },
                        { name: 'AWS', demand: 90, growth: '+18%', avgSalary: '$142K', openings: '70K+' },
                        { name: 'Terraform', demand: 86, growth: '+32%', avgSalary: '$140K', openings: '35K+' },
                        { name: 'Docker', demand: 88, growth: '+15%', avgSalary: '$135K', openings: '60K+' },
                        { name: 'CI/CD', demand: 84, growth: '+20%', avgSalary: '$130K', openings: '45K+' }
                    ]
                },
                {
                    name: 'Cybersecurity',
                    skills: [
                        { name: 'Cloud Security', demand: 94, growth: '+38%', avgSalary: '$152K', openings: '40K+' },
                        { name: 'Pen Testing', demand: 82, growth: '+22%', avgSalary: '$130K', openings: '28K+' },
                        { name: 'Zero Trust', demand: 80, growth: '+45%', avgSalary: '$145K', openings: '20K+' },
                        { name: 'SIEM/SOC', demand: 76, growth: '+18%', avgSalary: '$125K', openings: '30K+' },
                        { name: 'IAM', demand: 78, growth: '+25%', avgSalary: '$135K', openings: '22K+' }
                    ]
                },
                {
                    name: 'Web Development',
                    skills: [
                        { name: 'React', demand: 88, growth: '+12%', avgSalary: '$128K', openings: '75K+' },
                        { name: 'Next.js', demand: 82, growth: '+35%', avgSalary: '$132K', openings: '30K+' },
                        { name: 'TypeScript', demand: 91, growth: '+28%', avgSalary: '$130K', openings: '65K+' },
                        { name: 'Node.js', demand: 85, growth: '+10%', avgSalary: '$125K', openings: '55K+' },
                        { name: 'GraphQL', demand: 70, growth: '+15%', avgSalary: '$128K', openings: '18K+' }
                    ]
                },
                {
                    name: 'Data Engineering',
                    skills: [
                        { name: 'Apache Spark', demand: 84, growth: '+20%', avgSalary: '$145K', openings: '28K+' },
                        { name: 'Snowflake', demand: 80, growth: '+30%', avgSalary: '$140K', openings: '22K+' },
                        { name: 'Kafka', demand: 82, growth: '+25%', avgSalary: '$142K', openings: '20K+' },
                        { name: 'dbt', demand: 75, growth: '+40%', avgSalary: '$135K', openings: '15K+' },
                        { name: 'Airflow', demand: 78, growth: '+18%', avgSalary: '$138K', openings: '18K+' }
                    ]
                },
                {
                    name: 'Mobile Development',
                    skills: [
                        { name: 'Flutter', demand: 76, growth: '+28%', avgSalary: '$125K', openings: '20K+' },
                        { name: 'React Native', demand: 74, growth: '+12%', avgSalary: '$128K', openings: '22K+' },
                        { name: 'Swift', demand: 72, growth: '+8%', avgSalary: '$130K', openings: '18K+' },
                        { name: 'Kotlin', demand: 73, growth: '+15%', avgSalary: '$128K', openings: '16K+' }
                    ]
                }
            ],
            topTrending: ['LLM/GenAI', 'Kubernetes', 'Cloud Security', 'TypeScript', 'Rust'],
            emergingSkills: ['Prompt Engineering', 'AI Agents', 'WebAssembly']
        });
    } catch (err) {
        console.error('Heatmap error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/ai/skillgap - Skill gap analysis
router.get('/skillgap', auth, async (req, res) => {
    try {
        if (req.user.role !== 'STUDENT') {
            return res.status(403).json({ error: 'Skill gap analysis is for students' });
        }

        const student = queryOne('SELECT * FROM student_profiles WHERE user_id = ?', [req.user.id]);
        if (!student) return res.status(404).json({ error: 'Student profile not found' });

        const studentData = {
            skills: decrypt(student.skills),
            interests: decrypt(student.interests),
            goals: decrypt(student.goals),
            bio: decrypt(student.bio)
        };

        if (genAI) {
            try {
                const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
                const prompt = `You are a career advisor AI. Analyze the skill gap for this student:

STUDENT PROFILE:
- Current Skills: ${studentData.skills}
- Interests: ${studentData.interests}
- Goals: ${studentData.goals}
- Bio: ${studentData.bio || 'N/A'}

Return a JSON object (no markdown, no code blocks, just raw JSON):
{
  "currentSkills": [
    { "name": "<skill>", "level": <1-100 proficiency estimate>, "marketDemand": <1-100> }
  ],
  "missingSkills": [
    { "name": "<skill they should learn>", "priority": "high|medium|low", "marketDemand": <1-100>, "timeToLearn": "<e.g. 2-3 months>", "reason": "<why this matters for their goals>" }
  ],
  "overallReadiness": <0-100 score>,
  "strongAreas": ["<area1>", "<area2>"],
  "recommendations": [
    "<specific actionable recommendation 1>",
    "<specific actionable recommendation 2>",
    "<specific actionable recommendation 3>"
  ]
}

Be specific and realistic. Analyze based on their goals and current skill set. Include 4-6 current skills and 5-8 missing skills.`;

                const result = await model.generateContent(prompt);
                const text = result.response.text().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                const skillgap = JSON.parse(text);
                return res.json(skillgap);
            } catch (aiErr) {
                console.error('Gemini skillgap error, falling back to mock:', aiErr.message);
            }
        }

        // Smart mock based on student profile
        const skillsList = (studentData.skills || '').split(',').map(s => s.trim()).filter(Boolean);
        const interestsList = (studentData.interests || '').split(',').map(s => s.trim()).filter(Boolean);

        const currentSkills = skillsList.slice(0, 6).map((s, i) => ({
            name: s,
            level: Math.max(30, 85 - i * 10),
            marketDemand: Math.max(50, 90 - i * 8)
        }));

        if (currentSkills.length === 0) {
            currentSkills.push(
                { name: 'Problem Solving', level: 50, marketDemand: 85 },
                { name: 'Basic Programming', level: 40, marketDemand: 90 }
            );
        }

        const allMissingSkills = [
            { name: 'System Design', priority: 'high', marketDemand: 92, timeToLearn: '3-4 months', reason: 'Essential for senior roles and architecture decisions' },
            { name: 'Docker & Kubernetes', priority: 'high', marketDemand: 90, timeToLearn: '2-3 months', reason: 'Industry standard for deployment and scaling' },
            { name: 'CI/CD Pipelines', priority: 'medium', marketDemand: 84, timeToLearn: '1-2 months', reason: 'Required for modern development workflows' },
            { name: 'Cloud Services (AWS/GCP)', priority: 'high', marketDemand: 91, timeToLearn: '2-4 months', reason: 'Most companies are cloud-first' },
            { name: 'TypeScript', priority: 'medium', marketDemand: 88, timeToLearn: '1-2 months', reason: 'Increasingly required in frontend and backend roles' },
            { name: 'Testing (Unit/E2E)', priority: 'medium', marketDemand: 80, timeToLearn: '1-2 months', reason: 'Critical for code quality and maintainability' },
            { name: 'GraphQL', priority: 'low', marketDemand: 70, timeToLearn: '2-3 weeks', reason: 'Growing adoption in modern API architectures' },
            { name: 'AI/ML Fundamentals', priority: 'high', marketDemand: 95, timeToLearn: '3-6 months', reason: 'AI skills are in highest demand across all roles' }
        ];

        const missingSkills = allMissingSkills.filter(ms =>
            !skillsList.some(s => s.toLowerCase().includes(ms.name.toLowerCase()) || ms.name.toLowerCase().includes(s.toLowerCase()))
        ).slice(0, 6);

        const readiness = Math.min(90, Math.round(currentSkills.reduce((sum, s) => sum + s.level, 0) / Math.max(currentSkills.length, 1)));

        res.json({
            currentSkills,
            missingSkills,
            overallReadiness: readiness,
            strongAreas: skillsList.slice(0, 2).length > 0 ? skillsList.slice(0, 2) : ['Foundational Skills'],
            recommendations: [
                `Focus on learning ${missingSkills[0]?.name || 'system design'} first — it has the highest impact on your career goals`,
                `Your ${currentSkills[0]?.name || 'current skills'} foundation is strong — build on it with related technologies`,
                `Consider building a portfolio project that combines ${interestsList[0] || 'your interests'} with practical applications`
            ]
        });
    } catch (err) {
        console.error('Skillgap error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/ai/resume-analyze - AI resume analysis
router.post('/resume-analyze', auth, async (req, res) => {
    try {
        const { resumeText, targetRole } = req.body;
        if (!resumeText || resumeText.trim().length < 50) {
            return res.status(400).json({ error: 'Please provide resume text (at least 50 characters)' });
        }

        // Get student profile for context if available
        let studentData = {};
        if (req.user.role === 'STUDENT') {
            const student = queryOne('SELECT * FROM student_profiles WHERE user_id = ?', [req.user.id]);
            if (student) {
                studentData = { skills: decrypt(student.skills), interests: decrypt(student.interests), goals: decrypt(student.goals) };
            }
        }

        if (genAI) {
            try {
                const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
                const prompt = `You are an expert resume reviewer and career coach. Analyze the following resume and provide detailed, actionable feedback.

RESUME TEXT:
"""
${resumeText.slice(0, 5000)}
"""

${targetRole ? `TARGET ROLE: ${targetRole}` : ''}
${studentData.goals ? `CAREER GOALS: ${studentData.goals}` : ''}
${studentData.skills ? `KNOWN SKILLS: ${studentData.skills}` : ''}

Return a JSON object (no markdown, no code blocks, just raw JSON):
{
  "overallScore": <0-100>,
  "summary": "<2-3 sentence overall assessment>",
  "sections": {
    "contact": { "score": <0-100>, "feedback": "<specific feedback>" },
    "summary": { "score": <0-100>, "feedback": "<feedback about professional summary/objective>" },
    "experience": { "score": <0-100>, "feedback": "<feedback about work experience section>" },
    "skills": { "score": <0-100>, "feedback": "<feedback about skills section>" },
    "education": { "score": <0-100>, "feedback": "<feedback about education section>" },
    "formatting": { "score": <0-100>, "feedback": "<feedback about overall formatting and structure>" }
  },
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>", "<weakness 3>"],
  "keywordSuggestions": ["<keyword 1>", "<keyword 2>", "<keyword 3>", "<keyword 4>", "<keyword 5>"],
  "atsScore": <0-100>,
  "atsTips": ["<tip 1>", "<tip 2>", "<tip 3>"],
  "actionItems": [
    { "priority": "high|medium|low", "action": "<specific actionable improvement>" },
    { "priority": "high|medium|low", "action": "<specific actionable improvement>" },
    { "priority": "high|medium|low", "action": "<specific actionable improvement>" },
    { "priority": "high|medium|low", "action": "<specific actionable improvement>" },
    { "priority": "high|medium|low", "action": "<specific actionable improvement>" }
  ],
  "improvedSummary": "<a rewritten professional summary for the resume>"
}

Be brutally honest but constructive. Score harshly - most resumes should be 40-75. Be very specific in your feedback with examples from the actual resume text.`;

                const result = await model.generateContent(prompt);
                const text = result.response.text().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                const analysis = JSON.parse(text);
                return res.json(analysis);
            } catch (aiErr) {
                console.error('Gemini resume error, falling back to mock:', aiErr.message);
            }
        }

        // Mock analysis based on simple text analysis
        const text = resumeText.toLowerCase();
        const wordCount = resumeText.split(/\s+/).length;
        const hasEmail = /@/.test(text);
        const hasPhone = /\d{10}|\(\d{3}\)|\d{3}[-.]/.test(text);
        const hasLinkedin = /linkedin/.test(text);
        const hasGithub = /github/.test(text);
        const hasSummary = /summary|objective|about me|profile/i.test(text);
        const hasExperience = /experience|work history|employment/i.test(text);
        const hasEducation = /education|degree|university|college/i.test(text);
        const hasSkills = /skills|technologies|proficient|competencies/i.test(text);
        const hasActionVerbs = /developed|implemented|managed|designed|led|created|built|optimized|improved|achieved/i.test(text);
        const hasMetrics = /\d+%|\d+ users|\d+ projects|\$\d+/i.test(text);

        const contactScore = (hasEmail ? 30 : 0) + (hasPhone ? 25 : 0) + (hasLinkedin ? 25 : 0) + (hasGithub ? 20 : 0);
        const summaryScore = hasSummary ? (wordCount > 100 ? 70 : 50) : 20;
        const experienceScore = hasExperience ? (hasActionVerbs ? 70 : 50) + (hasMetrics ? 15 : 0) : 20;
        const skillsScore = hasSkills ? 65 : 25;
        const educationScore = hasEducation ? 70 : 25;
        const formattingScore = wordCount > 200 ? 60 : 35;

        const overallScore = Math.round((contactScore + summaryScore + experienceScore + skillsScore + educationScore + formattingScore) / 6);

        const strengths = [];
        const weaknesses = [];
        if (hasEmail) strengths.push('Contact email is present');
        if (hasActionVerbs) strengths.push('Uses strong action verbs to describe experience');
        if (hasSkills) strengths.push('Includes a dedicated skills section');
        if (hasMetrics) strengths.push('Quantifies achievements with metrics');
        if (!hasSummary) weaknesses.push('Missing professional summary/objective section');
        if (!hasLinkedin) weaknesses.push('No LinkedIn profile link included');
        if (!hasGithub) weaknesses.push('No GitHub/portfolio link for showcasing projects');
        if (!hasMetrics) weaknesses.push('Lacks quantifiable achievements and metrics');
        if (!hasActionVerbs) weaknesses.push('Should use more action verbs (Developed, Implemented, Led, etc.)');

        if (strengths.length === 0) strengths.push('Resume contains some basic information');
        if (weaknesses.length === 0) weaknesses.push('Consider adding more specific project details');

        res.json({
            overallScore,
            summary: `Your resume scores ${overallScore}/100. ${overallScore >= 70 ? 'Good foundation with room to strengthen specific sections.' : overallScore >= 50 ? 'Decent start but needs significant improvements in several areas.' : 'Needs major work across multiple sections to be competitive.'}`,
            sections: {
                contact: { score: contactScore, feedback: hasEmail ? 'Email found. ' + (hasLinkedin ? 'LinkedIn included.' : 'Add your LinkedIn profile URL.') + (hasGithub ? ' GitHub included.' : ' Add your GitHub profile.') : 'Missing email address. Ensure contact info is at the top of your resume.' },
                summary: { score: summaryScore, feedback: hasSummary ? 'Professional summary detected. Make sure it highlights your unique value proposition in 2-3 sentences.' : 'No professional summary found. Add a compelling 2-3 sentence summary at the top of your resume.' },
                experience: { score: experienceScore, feedback: hasExperience ? (hasActionVerbs ? 'Good use of action verbs.' : 'Start bullet points with strong action verbs.') + (hasMetrics ? ' Includes metrics.' : ' Add quantifiable metrics (%, users, revenue, etc).') : 'No clear experience section found. Add work experience with action-oriented bullet points.' },
                skills: { score: skillsScore, feedback: hasSkills ? 'Skills section found. Organize into categories (Languages, Frameworks, Tools, etc.) for better readability.' : 'No dedicated skills section. Add one with categorized technical and soft skills.' },
                education: { score: educationScore, feedback: hasEducation ? 'Education section found. Include GPA if above 3.5, relevant coursework, and honors.' : 'No education section detected. Add your educational background.' },
                formatting: { score: formattingScore, feedback: wordCount < 200 ? 'Resume appears too short. Aim for 400-600 words for early career, 600-800 for experienced.' : wordCount > 800 ? 'Resume may be too long. Keep it concise — 1 page for early career, 2 pages max.' : 'Length appears reasonable. Ensure consistent formatting throughout.' }
            },
            strengths: strengths.slice(0, 3),
            weaknesses: weaknesses.slice(0, 3),
            keywordSuggestions: ['problem-solving', 'collaborated', 'cross-functional', 'scalable', 'data-driven'],
            atsScore: Math.max(30, overallScore - 10),
            atsTips: [
                'Use standard section headings (Experience, Education, Skills)',
                'Avoid tables, columns, and graphics that ATS cannot parse',
                'Include keywords from the target job description'
            ],
            actionItems: [
                { priority: 'high', action: weaknesses[0] || 'Add a compelling professional summary' },
                { priority: 'high', action: 'Add quantifiable metrics to each bullet point (numbers, percentages, results)' },
                { priority: 'medium', action: 'Tailor resume keywords to match your target job description' },
                { priority: 'medium', action: 'Include links to portfolio, GitHub, and LinkedIn' },
                { priority: 'low', action: 'Proofread for grammar and consistency in formatting' }
            ],
            improvedSummary: `Results-driven ${targetRole || 'professional'} with hands-on experience in ${studentData.skills || 'software development'}. Passionate about ${studentData.interests || 'building innovative solutions'} with a track record of delivering impactful projects. Seeking to leverage technical expertise and problem-solving skills to drive growth in a dynamic team.`
        });
    } catch (err) {
        console.error('Resume analysis error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// POST /api/ai/industry-content - Industry content dashboard
router.post('/industry-content', auth, async (req, res) => {
    try {
        // Fetch user skill context
        let userContext = {};
        if (req.user.role === 'STUDENT') {
            const sp = queryOne('SELECT * FROM student_profiles WHERE user_id = ?', [req.user.id]);
            if (sp) userContext = { skills: decrypt(sp.skills), interests: decrypt(sp.interests), goals: decrypt(sp.goals) };
        } else {
            const mp = queryOne('SELECT * FROM mentor_profiles WHERE user_id = ?', [req.user.id]);
            if (mp) userContext = { expertise: decrypt(mp.expertise), title: decrypt(mp.title) };
        }

        if (genAI) {
            try {
                const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
                const prompt = `You are an industry content curator. Generate a personalized content dashboard for a ${req.user.role === 'STUDENT' ? 'student' : 'mentor'}.

User context:
${userContext.skills ? `Skills: ${userContext.skills}` : ''}
${userContext.interests ? `Interests: ${userContext.interests}` : ''}
${userContext.goals ? `Goals: ${userContext.goals}` : ''}
${userContext.expertise ? `Expertise: ${userContext.expertise}` : ''}
${userContext.title ? `Role: ${userContext.title}` : ''}

Return ONLY raw JSON (no markdown, no code blocks):
{
  "articles": [
    { "title": "<engaging article title>", "summary": "<2-sentence summary>", "source": "<publication name>", "tag": "<category>", "readTime": "<N min read>", "publishedAgo": "<e.g. 2 days ago>", "url": "<real URL to the article or a Google News search URL for the topic>" }
  ],
  "courses": [
    { "title": "<course title>", "platform": "<Coursera|Udemy|edX|YouTube|etc>", "level": "<Beginner|Intermediate|Advanced>", "duration": "<e.g. 8 hours>", "tag": "<skill tag>", "rating": "<e.g. 4.8>", "url": "<real or platform search URL for this course>" }
  ],
  "jobInsights": [
    { "role": "<job title>", "avgSalary": "<e.g. $120k-$150k>", "openings": "<e.g. 12,400>", "growth": "<e.g. +18% YoY>", "skills": ["<skill1>", "<skill2>", "<skill3>"], "url": "<LinkedIn Jobs or Indeed search URL for this role>" }
  ],
  "weeklyDigest": "<2 engaging paragraphs summarizing the biggest industry developments this week relevant to the user's profile>"
}

Generate 5 articles, 4 courses, 4 job insights. Make everything highly relevant, realistic, and current (2025).`;

                const result = await model.generateContent(prompt);
                const text = result.response.text().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                const content = JSON.parse(text);
                return res.json(content);
            } catch (aiErr) {
                console.error('Gemini industry-content error, using mock:', aiErr.message);
            }
        }

        // Rich mock fallback — varied pool, shuffled per request so content feels fresh
        const skills = userContext.skills || userContext.expertise || 'Software Development';
        const interests = userContext.interests || '';
        const goals = userContext.goals || '';
        const contextText = `${skills} ${interests} ${goals}`.toLowerCase();

        // Helper: seeded-ish shuffle for variety without being completely random
        function shuffle(arr) {
            const a = [...arr];
            for (let i = a.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [a[i], a[j]] = [a[j], a[i]];
            }
            return a;
        }

        const allArticles = [
            { title: 'Why AI Agents Are Replacing Traditional Software Pipelines', summary: 'Autonomous AI agents are now handling multi-step tasks that once required entire engineering teams. Companies like Salesforce and ServiceNow report 60% reduction in manual workloads after adopting agentic workflows.', source: 'TechCrunch', tag: 'AI & Automation', readTime: '5 min read', publishedAgo: '1 day ago', url: 'https://techcrunch.com/tag/artificial-intelligence/' },
            { title: 'Full-Stack Engineers Are the Most Hired in 2025', summary: 'New LinkedIn Workforce Report reveals full-stack roles grew 34% YoY — higher than any other engineering title. Employers now prioritize end-to-end ownership over narrow specialization.', source: 'LinkedIn News', tag: 'Career Trends', readTime: '4 min read', publishedAgo: '2 days ago', url: 'https://www.linkedin.com/pulse/topics/engineering/' },
            { title: 'GitHub Copilot Surpasses 50,000 Enterprise Customers', summary: "GitHub's AI pair programmer hit a new milestone, with enterprise customers reporting 2x developer throughput. The tool now suggests architecturally-aware code changes, not just line completions.", source: 'The Verge', tag: 'Dev Tools', readTime: '3 min read', publishedAgo: '3 days ago', url: 'https://github.blog/' },
            { title: 'Kubernetes 2025: Patterns Every Engineer Must Know', summary: 'From GitOps to eBPF networking, the Kubernetes ecosystem has matured dramatically. This deep-dive covers the production patterns top SRE teams are adopting for reliability at scale.', source: 'InfoQ', tag: 'Cloud & DevOps', readTime: '8 min read', publishedAgo: '2 days ago', url: 'https://www.infoq.com/devops/' },
            { title: 'Open-Source LLMs Are Closing the Gap With GPT-4o', summary: 'Mistral Large 2, LLaMA 3.3, and Qwen 2.5 are now within 5% benchmark accuracy of GPT-4o. Cost-conscious teams are switching, cutting inference costs by 80%.', source: 'Wired', tag: 'AI/ML', readTime: '6 min read', publishedAgo: '4 days ago', url: 'https://www.wired.com/tag/artificial-intelligence/' },
            { title: 'Zero Trust Security Is Now a Baseline Requirement', summary: 'After a wave of supply-chain attacks in 2024, Zero Trust architecture has become table-stakes for any company handling sensitive data. Here\'s how leading security teams are implementing it.', source: 'Krebs on Security', tag: 'Cybersecurity', readTime: '7 min read', publishedAgo: '3 days ago', url: 'https://krebsonsecurity.com/' },
            { title: 'React 19: Everything That Actually Changed', summary: 'React 19 ships server components, the new compiler, and Actions API as stable features. The performance gains in real-world apps are averaging 40% improvement in Time-to-Interactive.', source: 'Smashing Magazine', tag: 'Frontend', readTime: '9 min read', publishedAgo: '5 days ago', url: 'https://www.smashingmagazine.com/category/react/' },
            { title: 'The Real Cost of Technical Debt in 2025', summary: 'A McKinsey analysis of 2,000 engineering orgs found that teams spending 40%+ of sprint capacity on tech debt are 3x more likely to miss product deadlines. Practical refactoring strategies inside.', source: 'McKinsey Digital', tag: 'Engineering Culture', readTime: '10 min read', publishedAgo: '6 days ago', url: 'https://www.mckinsey.com/capabilities/mckinsey-digital/our-insights' },
            { title: 'Python Remains the #1 Language for Data & AI in 2025', summary: 'Stack Overflow\'s annual survey confirms Python\'s dominance for the 5th consecutive year, with 70% of ML engineers and 55% of data engineers using it as their primary language.', source: 'Stack Overflow Blog', tag: 'Data Science', readTime: '4 min read', publishedAgo: '1 week ago', url: 'https://stackoverflow.blog/' },
            { title: 'How Top Engineers Are Using RAG to Power Internal Tools', summary: 'Retrieval-augmented generation (RAG) is moving from research to production. Engineering teams at Notion, Linear, and Figma share how they built knowledge-grounded AI assistants for their products.', source: 'a16z Engineering', tag: 'AI Engineering', readTime: '7 min read', publishedAgo: '2 days ago', url: 'https://a16z.com/category/ai/' },
            { title: 'TypeScript 5.8 Ships Smarter Type Inference', summary: 'The latest TypeScript release dramatically reduces the need for explicit type annotations while catching more bugs at compile time. Early adopters report 20% less boilerplate code in large codebases.', source: 'Dev.to', tag: 'Frontend', readTime: '5 min read', publishedAgo: '4 days ago', url: 'https://devblogs.microsoft.com/typescript/' },
            { title: 'The Data Engineering Stack Has Consolidated Around 5 Tools', summary: 'After years of fragmentation, the modern data stack is converging on dbt, Airflow, Snowflake/BigQuery, Kafka, and Spark. This article examines why and what it means for data engineers.', source: 'Data Engineering Weekly', tag: 'Data Engineering', readTime: '8 min read', publishedAgo: '5 days ago', url: 'https://www.dataengineeringweekly.com/' },
        ];

        const allCourses = [
            { title: 'The Complete JavaScript Course 2025', platform: 'Udemy', level: 'Beginner', duration: '69 hours', tag: 'JavaScript', rating: '4.7', url: 'https://www.udemy.com/course/the-complete-javascript-course/' },
            { title: 'System Design Interview – An Insider\'s Guide', platform: 'educative.io', level: 'Intermediate', duration: '20 hours', tag: 'Architecture', rating: '4.9', url: 'https://www.educative.io/courses/grokking-the-system-design-interview' },
            { title: 'Machine Learning Specialization (Andrew Ng)', platform: 'Coursera', level: 'Beginner', duration: '3 months', tag: 'AI/ML', rating: '4.9', url: 'https://www.coursera.org/specializations/machine-learning-introduction' },
            { title: 'AWS Certified Solutions Architect – Associate', platform: 'Udemy', level: 'Intermediate', duration: '27 hours', tag: 'Cloud', rating: '4.7', url: 'https://www.udemy.com/course/aws-certified-solutions-architect-associate-saa-c03/' },
            { title: 'Docker & Kubernetes: The Practical Guide 2025', platform: 'Udemy', level: 'Intermediate', duration: '23 hours', tag: 'DevOps', rating: '4.8', url: 'https://www.udemy.com/course/docker-kubernetes-the-practical-guide/' },
            { title: 'React – The Complete Guide (incl. React 19)', platform: 'Udemy', level: 'Beginner', duration: '68 hours', tag: 'Frontend', rating: '4.6', url: 'https://www.udemy.com/course/react-the-complete-guide-incl-redux/' },
            { title: 'LangChain & Vector Databases in Production', platform: 'DeepLearning.AI', level: 'Intermediate', duration: '8 hours', tag: 'AI Engineering', rating: '4.8', url: 'https://learn.deeplearning.ai/' },
            { title: 'Python for Data Science, AI & Development', platform: 'Coursera', level: 'Beginner', duration: '25 hours', tag: 'Python', rating: '4.5', url: 'https://www.coursera.org/learn/python-for-applied-data-science-ai' },
            { title: 'Ethical Hacking & Penetration Testing (OSCP Prep)', platform: 'Udemy', level: 'Advanced', duration: '70 hours', tag: 'Cybersecurity', rating: '4.6', url: 'https://www.udemy.com/course/learn-ethical-hacking-from-scratch/' },
            { title: 'dbt (Data Build Tool) Bootcamp: Zero to Hero', platform: 'Udemy', level: 'Intermediate', duration: '8 hours', tag: 'Data Engineering', rating: '4.7', url: 'https://www.udemy.com/course/complete-dbt-data-build-tool-bootcamp-from-zero-to-hero-learn-dbt/' },
            { title: 'Node.js, Express, MongoDB & More: The Complete Bootcamp', platform: 'Udemy', level: 'Intermediate', duration: '42 hours', tag: 'Backend', rating: '4.8', url: 'https://www.udemy.com/course/nodejs-express-mongodb-bootcamp/' },
            { title: 'Flutter & Dart – The Complete Guide [2025 Edition]', platform: 'Udemy', level: 'Beginner', duration: '46 hours', tag: 'Mobile', rating: '4.6', url: 'https://www.udemy.com/course/learn-flutter-dart-to-build-ios-android-apps/' },
        ];

        const allJobInsights = [
            { role: 'Full-Stack Developer', avgSalary: '$95k–$140k', openings: '48,200', growth: '+22% YoY', skills: ['React', 'Node.js', 'PostgreSQL'], url: 'https://www.linkedin.com/jobs/search/?keywords=full+stack+developer' },
            { role: 'AI/ML Engineer', avgSalary: '$130k–$185k', openings: '32,500', growth: '+41% YoY', skills: ['Python', 'PyTorch', 'LLM Fine-tuning'], url: 'https://www.linkedin.com/jobs/search/?keywords=machine+learning+engineer' },
            { role: 'Cloud Architect', avgSalary: '$145k–$200k', openings: '18,900', growth: '+29% YoY', skills: ['AWS', 'Kubernetes', 'Terraform'], url: 'https://www.linkedin.com/jobs/search/?keywords=cloud+architect' },
            { role: 'DevOps Engineer', avgSalary: '$110k–$155k', openings: '27,300', growth: '+19% YoY', skills: ['Docker', 'CI/CD', 'Prometheus'], url: 'https://www.linkedin.com/jobs/search/?keywords=devops+engineer' },
            { role: 'Frontend Developer', avgSalary: '$85k–$130k', openings: '55,100', growth: '+15% YoY', skills: ['React', 'TypeScript', 'Next.js'], url: 'https://www.linkedin.com/jobs/search/?keywords=frontend+developer' },
            { role: 'Cybersecurity Analyst', avgSalary: '$90k–$145k', openings: '41,000', growth: '+33% YoY', skills: ['SIEM', 'Incident Response', 'Pen Testing'], url: 'https://www.linkedin.com/jobs/search/?keywords=cybersecurity+analyst' },
            { role: 'Data Engineer', avgSalary: '$115k–$160k', openings: '22,400', growth: '+26% YoY', skills: ['Spark', 'dbt', 'Snowflake'], url: 'https://www.linkedin.com/jobs/search/?keywords=data+engineer' },
            { role: 'Backend Developer', avgSalary: '$90k–$145k', openings: '38,700', growth: '+18% YoY', skills: ['Node.js', 'Python', 'PostgreSQL'], url: 'https://www.linkedin.com/jobs/search/?keywords=backend+developer' },
            { role: 'Mobile Developer', avgSalary: '$95k–$148k', openings: '19,200', growth: '+20% YoY', skills: ['Flutter', 'Swift', 'Kotlin'], url: 'https://www.linkedin.com/jobs/search/?keywords=mobile+app+developer' },
            { role: 'AI Prompt Engineer', avgSalary: '$100k–$165k', openings: '12,800', growth: '+78% YoY', skills: ['GPT-4', 'LangChain', 'RAG'], url: 'https://www.linkedin.com/jobs/search/?keywords=prompt+engineer+AI' },
        ];

        const digests = [
            `This week in tech, AI agents moved from proof-of-concept to production at breakneck speed. OpenAI's GPT-4o Mini and Google's Gemini 2.0 Flash are powering entire customer service workflows autonomously, with enterprises reporting 40–60% cost reductions in support operations. Meanwhile, developer tools are catching up — GitHub Copilot, Cursor, and Windsurf are now adopted by over 50% of professional engineers surveyed by Stack Overflow.\n\nOn the cloud front, AWS re:Invent announcements are still resonating across the industry, with teams rapidly adopting managed AI inference endpoints instead of self-hosting models. For career growth, the clearest signal remains: engineers who can bridge AI capabilities with production-grade software engineering are commanding the highest salaries in the current market — averaging $160k+ in the US and €90k+ in Europe.`,
            `The open-source AI ecosystem had a massive week. Meta released LLaMA 3.3 70B with performance rivaling GPT-4o on reasoning benchmarks, available for free commercial use. Mistral also shipped Mistral Large 2 with a 128k context window. For developers, this means state-of-the-art AI is now accessible without expensive API costs — a game-changer for startups and indie developers.\n\nIn the cybersecurity space, a wave of AI-powered phishing attacks has forced companies to rethink their email security stack. Zero-trust principles and hardware MFA keys are being adopted even by mid-size companies. Meanwhile, the EU AI Act has entered its first enforcement phase, requiring companies operating in Europe to begin AI system risk assessments immediately.`,
            `Big news for backend engineers: Node.js 22 LTS is now production-stable and ships with a native test runner, TypeScript type stripping support, and a 30% performance improvement over Node 18. Teams on older Node versions are fast-tracking upgrades, particularly those with I/O-heavy microservices. The Bun runtime also crossed 1.0 and is being deployed in production at several high-traffic startups.\n\nThe data engineering world is rapidly consolidating around the "modern data stack" — with dbt, Airflow, and Snowflake forming the triumvirate for most mid-to-large companies. Apache Iceberg is emerging as the de-facto open table format for data lakes, supported natively by Snowflake, BigQuery, and AWS Glue. If you're a data engineer without Iceberg experience, it's worth adding to your 2025 learning list.`,
        ];

        const shuffledArticles = shuffle(allArticles).slice(0, 5);
        const shuffledCourses = shuffle(allCourses).slice(0, 4);
        const shuffledJobs = shuffle(allJobInsights).slice(0, 4);
        const digest = digests[Math.floor(Math.random() * digests.length)];

        res.json({
            articles: shuffledArticles,
            courses: shuffledCourses,
            jobInsights: shuffledJobs,
            weeklyDigest: digest
        });
    } catch (err) {
        console.error('Industry content error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/ai/quiz-analyze - Analyze quiz answers for skills/interests
router.post('/quiz-analyze', auth, async (req, res) => {
    try {
        const { answers } = req.body;
        if (!answers || !Array.isArray(answers)) {
            return res.status(400).json({ error: 'Please provide an array of quiz answers' });
        }

        if (genAI) {
            try {
                const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
                const prompt = `You are a career consultant AI. Based on the following student quiz answers, suggest 3-5 technical skills, 3-5 interests, and 1 clear career goal.

QUIZ ANSWERS:
${answers.map((a, i) => `Q${i + 1}: ${a.question}\nA: ${a.answer}`).join('\n\n')}

Return a JSON object (no markdown, no code blocks):
{
  "skills": "comma, separated, skills",
  "interests": "comma, separated, interests",
  "goals": "a concise career goal sentence",
  "explanation": "a short 2-sentence explanation of why these were chosen"
}

Be specific and professional. Recommendations should be actionable and relevant to the 2025 tech market.`;

                const result = await model.generateContent(prompt);
                const text = result.response.text().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                const analysis = JSON.parse(text);
                return res.json(analysis);
            } catch (aiErr) {
                console.error('Gemini quiz error, using mock:', aiErr.message);
            }
        }

        // Mock analysis fallback
        res.json({
            skills: "React, JavaScript, Node.js, Web Development",
            interests: "Frontend Engineering, UI/UX Design, Open Source",
            goals: "Become a Full-Stack Developer specializing in modern web ecosystems.",
            explanation: "Based on your preference for building visual tools and interactive experiences, a path in Modern Web Development is highly recommended."
        });
    } catch (err) {
        console.error('Quiz analysis error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
