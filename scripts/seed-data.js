/* =========================================================
   Starting content for a new database:   npm run db:seed
   Only fills tables that are EMPTY (never overwrites your posts).
   Taken from the school Facebook posts (some dates are samples).
   ========================================================= */

export const SEED_DATA = {
  "news": [
    {
      "id": "n1",
      "title": "Congratulations, James Marcus L. Arbues!",
      "category": "Alumni",
      "date": "2026-09-22",
      "summary": "ECA Class of 2018 alumnus, for passing the Criminology Licensure Examination.",
      "image": "assets/images/news/alumni-arbues.jpg",
      "isPoster": true,
      "facebookUrl": "",
      "status": "published"
    },
    {
      "id": "n2",
      "title": "Congratulations, Gorg Elbert N. Flores!",
      "category": "Alumni",
      "date": "2026-09-20",
      "summary": "ECA Class of 2018, Bachelor of Arts in Film and Visual Effects, Cum Laude.",
      "image": "assets/images/news/alumni-flores.jpg",
      "isPoster": true,
      "facebookUrl": "",
      "status": "published"
    },
    {
      "id": "n3",
      "title": "On-going Registration: Nursery to Senior High School",
      "category": "Admissions",
      "date": "2026-09-18",
      "summary": "Enroll now. Office hours: Monday to Friday, 8:00 AM to 5:00 PM.",
      "author": "Registrar's Office",
      "body": "ON-GOING REGISTRATION!\n\nBe an ELIMNIAN, where academic excellence meets values formation. Enrollment is now open for learners from Nursery to Senior High School.\n\nWhy choose ECA\n• PEAC-accredited school\n• ESC grantees are accepted\n• Christ-centered education in Trece Martires City since 1993\n\nWhat to bring\n• PSA Birth Certificate\n• Report Card (SF9)\n• Certificate of Good Moral Character\n• Two 2x2 ID pictures\n• Learner Reference Number (LRN)\nTransferees may need additional documents.\n\nOffice hours: Monday to Friday, 8:00 AM to 5:00 PM\nQuestions? Message us on our Facebook page, call 0939 909 8717 or (046) 419 1668, or email elim.educ@gmail.com.",
      "image": "assets/images/news/enrollment-poster.jpg",
      "isPoster": true,
      "facebookUrl": "",
      "status": "published"
    },
    {
      "id": "n4",
      "title": "We Are Hiring: High School Teachers",
      "category": "Careers",
      "date": "2026-09-15",
      "summary": "Major in Science and BTLE (NC II holders preferred). Send your CV to elim.educ@gmail.com.",
      "image": "assets/images/news/hiring.jpg",
      "isPoster": true,
      "facebookUrl": "",
      "status": "published"
    },
    {
      "id": "n5",
      "title": "Learning Session with Mr. Vincent G. Oczon, LPT",
      "category": "Seminar",
      "date": "2026-09-12",
      "summary": "",
      "image": "assets/images/news/seminar.jpg",
      "isPoster": false,
      "facebookUrl": "",
      "status": "draft"
    },
    {
      "id": "n6",
      "title": "Children's Retreat 2025: Shield Squad",
      "category": "Spiritual Life",
      "date": "2026-08-30",
      "summary": "Secure in God's protection.",
      "image": "assets/images/news/childrens-retreat.jpg",
      "isPoster": false,
      "facebookUrl": "",
      "status": "draft"
    },
    {
      "id": "n7",
      "title": "33rd Founding Anniversary: Alumni Games",
      "category": "Event",
      "date": "2026-02-20",
      "summary": "Basketball and volleyball games for alumni on February 26, 2026.",
      "image": "assets/images/news/founding-anniversary.jpg",
      "isPoster": true,
      "facebookUrl": "",
      "status": "published"
    }
  ],
  "events": [
    {
      "id": "e1",
      "title": "Opening of Classes",
      "start": "2026-06-08",
      "end": "",
      "note": "",
      "type": "classes"
    },
    {
      "id": "e2",
      "title": "End-of-Term 1 Activities",
      "start": "2026-09-02",
      "end": "2026-09-15",
      "note": "",
      "type": "activity"
    },
    {
      "id": "e3",
      "title": "Term 2 Classes",
      "start": "2026-09-16",
      "end": "2026-12-04",
      "note": "",
      "type": "classes"
    },
    {
      "id": "e4",
      "title": "End-of-Term 2 Activities",
      "start": "2026-12-07",
      "end": "2026-12-18",
      "note": "",
      "type": "activity"
    },
    {
      "id": "e5",
      "title": "Term 3 Classes Begin",
      "start": "2027-01-04",
      "end": "",
      "note": "",
      "type": "classes"
    },
    {
      "id": "e6",
      "title": "Final Assessments and Closing Activities",
      "start": "2027-03-24",
      "end": "2027-04-08",
      "note": "",
      "type": "activity"
    }
  ],
  "albums": [
    {
      "id": "al1",
      "title": "Flag Ceremony",
      "caption": "Starting the week together",
      "category": "Campus",
      "date": "2026-09-21",
      "photos": [
        "assets/images/gallery/flag-ceremony.jpg"
      ],
      "featured": false,
      "status": "published"
    },
    {
      "id": "al2",
      "title": "Seminars & Talks",
      "caption": "Learning beyond the classroom",
      "category": "Academics",
      "date": "2026-08-28",
      "photos": [
        "assets/images/gallery/seminar.jpg"
      ],
      "featured": false,
      "status": "published"
    },
    {
      "id": "al3",
      "title": "Our Students",
      "caption": "Proudly ECA",
      "category": "Campus",
      "date": "2026-07-10",
      "photos": [
        "assets/images/gallery/students.jpg"
      ],
      "featured": true,
      "status": "published"
    },
    {
      "id": "al4",
      "title": "Faculty & Staff",
      "caption": "The people behind ECA",
      "category": "Community",
      "date": "2026-06-05",
      "photos": [
        "assets/images/gallery/faculty.jpg"
      ],
      "featured": false,
      "status": "published"
    },
    {
      "id": "al5",
      "title": "Children's Retreat",
      "caption": "Shield Squad 2025",
      "category": "Spiritual Life",
      "date": "2026-05-16",
      "photos": [
        "assets/images/gallery/childrens-retreat.jpg"
      ],
      "featured": true,
      "status": "published"
    },
    {
      "id": "al6",
      "title": "School Programs",
      "caption": "Gatherings and celebrations",
      "category": "Celebrations",
      "date": "2026-02-20",
      "photos": [
        "assets/images/gallery/school-program.jpg"
      ],
      "featured": false,
      "status": "published"
    }
  ],
  "announcements": {
    "enabled": true,
    "messages": [
      {
        "id": "a1",
        "text": "On-going registration for Early Childhood, Elementary, Junior High, and Senior High School!",
        "link": "#apply",
        "visible": true
      },
      {
        "id": "a2",
        "text": "Congratulations, James Marcus L. Arbues (Class of 2018), Criminology Licensure Examination passer!",
        "link": "#news",
        "visible": true
      },
      {
        "id": "a3",
        "text": "Congratulations, Gorg Elbert N. Flores (Class of 2018), BA Film and Visual Effects, Cum Laude!",
        "link": "#news",
        "visible": true
      },
      {
        "id": "a4",
        "text": "We are hiring High School Teachers major in Science and BTLE. Send your CV to elim.educ@gmail.com.",
        "link": "#news",
        "visible": true
      },
      {
        "id": "a5",
        "text": "Office hours: Monday to Friday, 8:00 AM to 5:00 PM.",
        "link": "#contact",
        "visible": true
      }
    ]
  }
};
