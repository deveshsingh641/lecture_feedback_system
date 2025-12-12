// Load environment variables FIRST
import dotenv from "dotenv";
dotenv.config();

import { seed } from "../server/seed.js";

async function main() {
  try {
    console.log("Starting database seeding...");
    await seed();
    console.log("✅ Database seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Database seeding failed:", error);
    process.exit(1);
  }
}

main();

