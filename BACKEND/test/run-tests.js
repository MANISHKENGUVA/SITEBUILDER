const { runTests } = require("./configBuilder.test");

async function main() {
  try {
    await runTests();
    process.exit(0);
  } catch (err) {
    console.error("Test runner encountered error:", err);
    process.exit(1);
  }
}

main();
