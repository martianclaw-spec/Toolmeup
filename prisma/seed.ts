import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Broad tool categories spanning the main trades.
// Icon names reference lucide-react; swap the strings if you use a
// different icon set. Add cautiously — each category needs 5+ listings
// to feel alive at launch.
const categories = [
  { slug: "power-tools",      name: "Power Tools",              icon: "drill" },
  { slug: "hand-tools",       name: "Hand Tools",               icon: "hammer" },
  { slug: "ladders-scaffold", name: "Ladders & Scaffolding",    icon: "move-up" },
  { slug: "plumbing",         name: "Plumbing",                 icon: "pipe" },
  { slug: "electrical",       name: "Electrical",               icon: "zap" },
  { slug: "landscaping",      name: "Landscaping & Yard",       icon: "trees" },
  { slug: "concrete-masonry", name: "Concrete & Masonry",       icon: "bricks" },
  { slug: "painting",         name: "Painting & Finishing",     icon: "paint-roller" },
  { slug: "hvac",             name: "HVAC",                     icon: "wind" },
  { slug: "roofing",          name: "Roofing",                  icon: "home" },
  { slug: "automotive",       name: "Automotive",               icon: "wrench" },
  { slug: "cleaning",         name: "Cleaning & Pressure Wash", icon: "spray-can" },
  { slug: "moving-hauling",   name: "Moving & Hauling",         icon: "truck" },
  { slug: "measuring-layout", name: "Measuring & Layout",       icon: "ruler" },
];

async function main() {
  for (const c of categories) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, icon: c.icon },
      create: c,
    });
  }
  console.log(`Seeded ${categories.length} categories.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
