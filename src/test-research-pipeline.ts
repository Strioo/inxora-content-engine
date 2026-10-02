import "dotenv/config";
import { researchTopic } from "./services/researcher.js";
import { resolveCoverImage } from "./services/image-generator.js";

async function test() {
  console.log("=== Testing SEO Deep Research & Image Engine with Dedup ===");
  const plan = await researchTopic("Panduan Memilih Tech Stack Website Bisnis Modern");
  console.log(`\n✓ Topic: ${plan.topic}`);
  console.log(`✓ Pain Points: ${plan.dossier?.keyIndustryPainPoints?.length}`);
  console.log(`✓ Benchmarks: ${plan.dossier?.benchmarks?.length}`);
  console.log(`✓ Authoritative Sources: ${plan.dossier?.authoritativeSources?.length}`);
  console.log(`✓ Visual Keywords: ${JSON.stringify(plan.dossier?.visualKeywords)}`);

  console.log("\n--- Test 1: Image resolution WITHOUT prior used images ---");
  const img1 = await resolveCoverImage(plan.topic, plan.category, plan.dossier?.visualKeywords);
  console.log(`✓ Cover 1 URL: ${img1.coverUrl}`);
  console.log(`✓ Attribution: Photo by ${img1.attribution.author} (${img1.attribution.license})`);

  console.log("\n--- Test 2: Image resolution WITH img1 in usedImages ---");
  const usedImages = new Set<string>([img1.coverUrl]);
  const img2 = await resolveCoverImage(plan.topic, plan.category, plan.dossier?.visualKeywords, usedImages);
  console.log(`✓ Cover 2 URL: ${img2.coverUrl}`);
  console.log(`✓ Attribution: Photo by ${img2.attribution.author} (${img2.attribution.license})`);

  if (img1.coverUrl !== img2.coverUrl) {
    console.log("\n✅ SUCCESS: Image deduplication confirmed! Cover 2 is completely distinct from Cover 1.");
  } else {
    console.error("\n❌ FAILED: Duplicate image was returned!");
    process.exit(1);
  }

  console.log("\n🎉 SEO Deep Research & Dedup Pipeline Test Passed!");
}

test().catch(console.error);
