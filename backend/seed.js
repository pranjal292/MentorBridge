require('dotenv').config();
const bcrypt = require('bcryptjs');
const { getDb, encrypt, saveDb } = require('./db');

async function seed() {
    const db = await getDb();
    console.log('🌱 Seeding MentorBridge database...');

    // Clear existing data
    db.run('DELETE FROM messages');
    db.run('DELETE FROM connections');
    db.run('DELETE FROM mentor_profiles');
    db.run('DELETE FROM student_profiles');
    db.run('DELETE FROM users');
    saveDb();

    const mentors = [
        {
            email: 'arjun.firmware@mentorbridge.dev',
            password: 'mentor123',
            name: 'Arjun Mehta',
            title: 'Senior Firmware Engineer',
            company: 'Qualcomm',
            expertise: 'C, C++, Embedded Systems, RTOS, ARM Cortex, IoT',
            bio: 'I have 8 years of experience building firmware for mobile processors and IoT devices at Qualcomm. I specialize in low-level C/C++ programming, real-time operating systems, and hardware-software co-design. I love mentoring students who are passionate about understanding how hardware and software interact at the deepest level.',
            meeting_link: 'https://meet.google.com/abc-defg-hij',
            years_exp: 8
        },
        {
            email: 'priya.frontend@mentorbridge.dev',
            password: 'mentor123',
            name: 'Priya Sharma',
            title: 'Lead Frontend Engineer',
            company: 'Flipkart',
            expertise: 'React, TypeScript, Next.js, CSS Architecture, Performance Optimization, Design Systems',
            bio: 'Leading the design system team at Flipkart, building components used by 200+ developers. Previously at Razorpay. I focus on creating accessible, performant web experiences at scale. Happy to guide students on modern frontend architecture and career growth in UI engineering.',
            meeting_link: 'https://meet.google.com/klm-nopq-rst',
            years_exp: 6
        },
        {
            email: 'rahul.security@mentorbridge.dev',
            password: 'mentor123',
            name: 'Rahul Verma',
            title: 'Cybersecurity Analyst',
            company: 'PwC India',
            expertise: 'Penetration Testing, Nmap, Metasploit, Burp Suite, OSCP, Network Security, Python',
            bio: 'OSCP-certified security professional with 5 years of experience in red team operations and vulnerability assessment. I have conducted security audits for Fortune 500 companies. Passionate about training the next generation of ethical hackers and security researchers.',
            meeting_link: 'https://meet.google.com/uvw-xyza-bcd',
            years_exp: 5
        },
        {
            email: 'sneha.ml@mentorbridge.dev',
            password: 'mentor123',
            name: 'Sneha Iyer',
            title: 'ML Research Engineer',
            company: 'Google DeepMind',
            expertise: 'Machine Learning, PyTorch, TensorFlow, NLP, Computer Vision, Python, Mathematics',
            bio: 'Working on large language model research at Google DeepMind. Previously at Microsoft Research India. My background is in applied mathematics and I transitioned into ML through rigorous self-study and research internships. I can help students understand the math behind ML and navigate the research career path.',
            meeting_link: 'https://meet.google.com/efg-hijk-lmn',
            years_exp: 7
        },
        {
            email: 'vikram.backend@mentorbridge.dev',
            password: 'mentor123',
            name: 'Vikram Singh',
            title: 'Principal Backend Engineer',
            company: 'Swiggy',
            expertise: 'Java, Spring Boot, Microservices, Kafka, Redis, PostgreSQL, System Design',
            bio: 'Building high-throughput order processing systems at Swiggy that handle millions of transactions daily. I have designed microservice architectures that scale to 100K+ requests per second. Love discussing system design, distributed systems, and helping students think about building reliable software.',
            meeting_link: 'https://meet.google.com/opq-rstu-vwx',
            years_exp: 10
        },
        {
            email: 'ananya.devops@mentorbridge.dev',
            password: 'mentor123',
            name: 'Ananya Gupta',
            title: 'DevOps Lead',
            company: 'Atlassian',
            expertise: 'Kubernetes, Docker, AWS, Terraform, CI/CD, Linux, Jenkins, Prometheus',
            bio: 'Managing cloud infrastructure at Atlassian for products used by millions of teams worldwide. Previously deployed large-scale Kubernetes clusters at Infosys. I believe DevOps is the backbone of modern software development and enjoy teaching infrastructure-as-code principles.',
            meeting_link: 'https://meet.google.com/yza-bcde-fgh',
            years_exp: 6
        },
        {
            email: 'karthik.mobile@mentorbridge.dev',
            password: 'mentor123',
            name: 'Karthik Nair',
            title: 'Senior Mobile Developer',
            company: 'PhonePe',
            expertise: 'Flutter, Dart, React Native, Android (Kotlin), iOS (Swift), Mobile Architecture',
            bio: 'Building cross-platform payment experiences at PhonePe used by 400M+ users. I have shipped apps from scratch to millions of downloads. I help students understand mobile development ecosystems, performance optimization, and building products that users love.',
            meeting_link: 'https://meet.google.com/ijk-lmno-pqr',
            years_exp: 5
        },
        {
            email: 'divya.data@mentorbridge.dev',
            password: 'mentor123',
            name: 'Divya Krishnan',
            title: 'Data Engineer',
            company: 'Amazon',
            expertise: 'Python, Apache Spark, Airflow, SQL, Redshift, Data Pipelines, ETL, BigQuery',
            bio: 'Building data pipelines at Amazon that process petabytes of data daily for supply chain optimization. I transitioned from a traditional CS background to data engineering by learning distributed computing. I can help students understand the data engineering landscape and build practical skills.',
            meeting_link: 'https://meet.google.com/stu-vwxy-zab',
            years_exp: 4
        }
    ];

    for (const mentor of mentors) {
        const hashedPassword = bcrypt.hashSync(mentor.password, 10);

        // Insert user
        db.run(
            'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)',
            [mentor.email, hashedPassword, encrypt(mentor.name), 'MENTOR']
        );

        // Get user ID using query
        const stmt = db.prepare('SELECT id FROM users WHERE email = ?');
        stmt.bind([mentor.email]);
        stmt.step();
        const userId = stmt.getAsObject().id;
        stmt.free();

        // Insert mentor profile
        db.run(
            'INSERT INTO mentor_profiles (user_id, title, company, expertise, bio, meeting_link, years_exp) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [userId, encrypt(mentor.title), encrypt(mentor.company), encrypt(mentor.expertise), encrypt(mentor.bio), encrypt(mentor.meeting_link), mentor.years_exp]
        );

        console.log(`  ✅ ${mentor.name} (${mentor.title} at ${mentor.company})`);
    }

    saveDb();

    console.log(`\n🎉 Seeded ${mentors.length} mentors successfully!`);
    console.log('📧 All mentor accounts use password: mentor123');
    console.log('\n🚀 Run "node server.js" to start the server.');
    process.exit(0);
}

seed().catch(err => {
    console.error('Seed error:', err);
    process.exit(1);
});
