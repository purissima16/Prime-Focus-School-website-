/**
 * Prime Focus Schools - Default Facilities, Events, Gallery & Site Photos Dataset
 * Used as initial seed data for Supabase and fallback before live data loads.
 */

const defaultSiteMedia = {
  facilities: [
    {
      id: "facility-main-campus",
      name: "Main Academic Campus",
      description:
        "Multi-storey purpose-built school building designed for safety, focus, and academic excellence.",
      image: "images/school-2.webp",
      sortOrder: 0,
      showOnHome: true
    },
    {
      id: "facility-courtyard-court",
      name: "Courtyard & Basketball Court",
      description:
        "Modern sports court and central courtyard facilitating physical education, recreation, and school assemblies.",
      image: "images/school-1.webp",
      sortOrder: 1,
      showOnHome: true
    },
    {
      id: "facility-ict-lab",
      name: "ICT Laboratory",
      description:
        "A space for technology, digital learning and computer skills.",
      image: "images/ict-lab.webp",
      sortOrder: 2,
      showOnHome: true
    },
    {
      id: "facility-physics-lab",
      name: "Physics Laboratory",
      description:
        "Supporting practical exploration of scientific principles.",
      image: "images/physics-lab.webp",
      sortOrder: 3,
      showOnHome: false
    },
    {
      id: "facility-chemistry-lab",
      name: "Chemistry Laboratory",
      description:
        "A learning environment for chemistry experiments and discovery.",
      image: "images/chemistry-lab.webp",
      sortOrder: 4,
      showOnHome: false
    },
    {
      id: "facility-biology-lab",
      name: "Biology Laboratory",
      description:
        "Encouraging students to explore life and the natural world.",
      image: "images/biology-lab.webp",
      sortOrder: 5,
      showOnHome: false
    },
    {
      id: "facility-td-lab",
      name: "Technical Drawing",
      description:
        "A space for technical drawing, design and visual problem-solving.",
      image: "images/td-lab.webp",
      sortOrder: 6,
      showOnHome: false
    }
  ],

  events: [
    {
      id: "cultural-day",
      title: "Annual Cultural Day",
      category: "Culture & Heritage",
      description:
        "A vibrant celebration of rich cultural heritage, diversity, creativity, and school community spirit.",
      cover: "images/events/hausa2.webp",
      sortOrder: 0,
      photos: [
        "images/events/edo.webp",
        "images/events/efik.webp",
        "images/events/yoruba.webp",
        "images/events/igbo 2.webp",
        "images/events/tiv2.webp",
        "images/events/hausa2.webp",
        "images/events/hausa.webp",
        "images/events/efik1.webp",
        "images/events/hausa1.webp",
        "images/events/igbo1.webp",
        "images/events/tiv1.webp"
      ]
    },
    {
      id: "graduation-day",
      title: "Graduation/Prize-Giving Day",
      category: "Academic & Valedictory",
      description:
        "Honouring academic excellence, outstanding achievements, dedication, and student personal growth.",
      cover: "images/events/anjola-award.webp",
      sortOrder: 1,
      photos: [
        "images/events/meeee-award.webp",
        "images/events/adeleye-award.webp",
        "images/events/afoo-award.webp",
        "images/events/anjola-award.webp",
        "images/events/eniayo-award.webp",
        "images/events/david.webp",
        "images/events/divine.webp",
        "images/events/fahamat.webp",
        "images/events/feranmi.webp",
        "images/events/ire.webp",
        "images/events/joseph.webp",
        "images/events/josy.webp",
        "images/events/rebecca.webp",
        "images/events/timiboy.webp",
        "images/events/timigirl.webp",
        "images/events/daniel.webp",
        "images/events/myset-award.webp",
        "images/events/angel.webp",
        "images/events/amanda.webp",
        "images/events/betty.webp",
        "images/events/bolu.webp",
        "images/events/fikayo.webp",
        "images/events/ore.webp",
        "images/events/chidera.webp",
        "images/events/dara.webp",
        "images/events/dave.webp",
        "images/events/destiny.webp",
        "images/events/esther.webp",
        "images/events/fola.webp",
        "images/events/halimah.webp",
        "images/events/mariam.webp",
        "images/events/oyin.webp",
        "images/events/taofeek.webp",
        "images/events/temi.webp",
        "images/events/timi.webp",
        "images/events/idk.webp",
        "images/events/idk2.webp",
        "images/events/idk3.webp",
        "images/events/josephine.webp",
        "images/events/jss3.webp"
      ]
    },
    {
      id: "activities-competitions",
      title: "Other Activities/Competitions",
      category: "Sports & Competitions",
      description:
        "Exciting moments of teamwork, healthy sportsmanship, peer collaboration, and school spirit.",
      cover: "images/events/ball.webp",
      sortOrder: 2,
      photos: [
        "images/events/girlsball.webp",
        "images/events/boysball.webp",
        "images/events/boysteam.webp",
        "images/events/girlsday.webp",
        "images/events/ball.webp",
        "images/events/donald.webp",
        "images/events/rejoice.webp"
      ]
    }
  ],

  galleryPhotos: [
    {
      id: "gallery-campus-hd",
      title: "Prime Focus Schools Campus",
      category: "Campus Life",
      caption: "Dedicated learning environment in Ipaja, Lagos.",
      image: "images/school-campus-hd.webp",
      sortOrder: 0
    },
    {
      id: "gallery-prefect-1",
      title: "Student Leadership & Prefects",
      category: "Student Leadership",
      caption: "Raising confident and responsible young leaders.",
      image: "images/events/eniprefect.webp",
      sortOrder: 1
    },
    {
      id: "gallery-prefect-2",
      title: "Prefectorial Honours",
      category: "Student Leadership",
      caption: "Service, discipline, and excellence in action.",
      image: "images/events/meeeeprefect.webp",
      sortOrder: 2
    },
    {
      id: "gallery-award-1",
      title: "Academic Award Recognition",
      category: "Awards & Honours",
      caption: "Celebrating diligence and outstanding academic achievement.",
      image: "images/events/princess-award.webp",
      sortOrder: 3
    },
    {
      id: "gallery-award-2",
      title: "Prize-Giving Ceremony Highlight",
      category: "Awards & Honours",
      caption: "Recognizing student growth and excellence.",
      image: "images/events/mariam-award.webp",
      sortOrder: 4
    },
    {
      id: "gallery-student-life",
      title: "PFS Student Community",
      category: "Campus Life",
      caption: "Learning and growing together every day.",
      image: "images/events/koyin.webp",
      sortOrder: 5
    }
  ],

  settings: {
    hero_banner: {
      key: "hero_banner",
      label: "Homepage Hero Banner",
      value: "images/school-hero.webp",
      caption: "Main full-width banner shown at the top of the home page."
    },
    page_hero_banner: {
      key: "page_hero_banner",
      label: "Subpages Header Banner",
      value: "images/school-hero.webp",
      caption:
        "Header background displayed on Gallery, Past Events, About, Blog, and Contact pages."
    },
    principal_portrait: {
      key: "principal_portrait",
      label: "Principal Portrait",
      value: "images/principal-pfs.webp",
      caption:
        "Every child deserves a future full of possibility. Glorify God Always."
    }
  },

  quickPickPhotos: [
    { label: "Academic Campus HD", src: "images/school-2.webp" },
    { label: "Courtyard & Court HD", src: "images/school-1.webp" },
    { label: "School Hero Panorama", src: "images/school-hero.webp" },
    { label: "Campus Full View", src: "images/school-campus-hd.webp" },
    { label: "ICT Lab", src: "images/ict-lab.webp" },
    { label: "Physics Lab", src: "images/physics-lab.webp" },
    { label: "Chemistry Lab", src: "images/chemistry-lab.webp" },
    { label: "Biology Lab", src: "images/biology-lab.webp" },
    { label: "Technical Drawing", src: "images/td-lab.webp" },
    { label: "Principal Photo", src: "images/principal-pfs.webp" },
    { label: "Cultural Day", src: "images/events/yoruba.webp" },
    { label: "Hausa Cultural", src: "images/events/hausa2.webp" },
    { label: "Awards Day", src: "images/events/anjola-award.webp" },
    { label: "Sports Day", src: "images/events/ball.webp" },
    { label: "Prefect Honours", src: "images/events/eniprefect.webp" }
  ]
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = { defaultSiteMedia };
}
