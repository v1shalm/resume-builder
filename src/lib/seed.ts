import type { Resume } from "./types";

// Starter resume shown on first load. Fictional persona — Arjun Mehta,
// a product designer with ~3 years across fintech, SaaS, and D2C. Use
// it as a template (the "Reset to starter" button brings this back)
// and clear it out when you're ready to type in your own.
export const seedResume: Resume = {
  header: {
    name: "Arjun Mehta",
    title: "Product Designer",
    tagline:
      "Product Designer with 3+ years shaping digital products across fintech, SaaS, and consumer commerce. I turn complex flows into calm, focused experiences — from zero-to-one explorations to shipping-scale design systems.",
    contacts: [
      {
        id: "c1",
        label: "email",
        value: "arjun.mehta@example.com",
        href: "mailto:arjun.mehta@example.com",
      },
      {
        id: "c2",
        label: "phone",
        value: "+91 98765 43210",
      },
      {
        id: "c3",
        label: "site",
        value: "arjunmehta.design",
        href: "https://arjunmehta.design",
      },
    ],
  },
  sectionOrder: ["experience", "education", "skills", "links"],
  sections: {
    experience: { id: "experience", title: "Experience", visible: true },
    education: { id: "education", title: "Education", visible: true },
    skills: { id: "skills", title: "Skills & Tools", visible: true },
    links: { id: "links", title: "Links", visible: true },
  },
  experience: [
    {
      id: "e1",
      company: "Lattice Labs",
      role: "Senior Product Designer",
      startDate: "Dec 2023",
      endDate: "Present",
      bullets: [
        {
          id: "b1",
          text: "Led the redesign of the consumer lending flow serving 2M+ users, reducing KYC drop-off by 24% through a restructured step-by-step layout and inline validation.",
        },
        {
          id: "b2",
          text: "Shipped the first version of Lattice's design system, consolidating 14 product teams onto a shared token and component layer and cutting handoff cycles by ~40%.",
        },
        {
          id: "b3",
          text: "Ran weekly usability sessions with research and data partners, translating qualitative insights into iterative improvements across the checkout and rewards surfaces.",
        },
      ],
    },
    {
      id: "e2",
      company: "Mintflow Studio",
      role: "UI/UX Designer",
      startDate: "Jul 2022",
      endDate: "Nov 2023",
      bullets: [
        {
          id: "b4",
          text: "Designed a B2B analytics dashboard from scratch for a logistics SaaS, scaling the information architecture to handle 30+ report types without overwhelming first-time users.",
        },
        {
          id: "b5",
          text: "Owned the brand-to-product identity mapping across three product launches, translating marketing-site aesthetics into a production-grade component library.",
        },
        {
          id: "b6",
          text: "Partnered with engineering on accessibility audits, bringing every customer-facing flow to WCAG AA and documenting patterns for future work.",
        },
      ],
    },
    {
      id: "e3",
      company: "Canvas Interactive",
      role: "Design Intern",
      startDate: "Jan 2022",
      endDate: "Jun 2022",
      bullets: [
        {
          id: "b7",
          text: "Supported the senior team on three client engagements across D2C commerce, delivering wireframes, high-fidelity screens, and interactive prototypes for usability tests.",
        },
        {
          id: "b8",
          text: "Built the studio's internal Figma foundation kit — type, color, and spacing tokens — used across subsequent client projects.",
        },
      ],
    },
  ],
  skillGroups: [
    {
      id: "s1",
      label: "Design",
      items:
        "Product Design, UX Design, UI Design, Interaction Design, Design Systems, Information Architecture, Wireframing, Prototyping, Visual Design, Accessibility, Motion Design",
    },
    {
      id: "s2",
      label: "Research",
      items:
        "User Research, Usability Testing, Heuristic Evaluation, A/B Testing, Journey Mapping, Analytics Instrumentation",
    },
    {
      id: "s3",
      label: "Tools",
      items:
        "Figma, Framer, Adobe Creative Cloud, Principle, Lottie, Notion, Linear, FigJam, Miro, Loom",
    },
  ],
  education: [
    {
      id: "ed1",
      degree: "Bachelor of Design",
      field: "Interaction Design",
      institution: "Anand Institute of Design, Pune",
      year: "2018 – 2022",
    },
  ],
  links: [
    {
      id: "l1",
      label: "Portfolio",
      url: "https://arjunmehta.design",
    },
    {
      id: "l2",
      label: "LinkedIn",
      url: "https://linkedin.com/in/arjunmehta-design",
    },
    {
      id: "l3",
      label: "Dribbble",
      url: "https://dribbble.com/arjunmehta",
    },
  ],
  style: {
    titleFontId: "source-serif",
    bodyFontId: "geist",
    themeId: "navy",
    accentColor: "#23316d",
    subAccentColor: "#525c87",
    nameFontWeight: 500,
    sectionTitleWeight: 600,
    subTitleWeight: 700,
    bodyWeight: 400,
    nameLetterSpacing: -0.024,
    bodyLineHeight: 1.55,
    sectionTitleLineHeight: 1.1,
    subTitleLineHeight: 1.3,
  },
};
