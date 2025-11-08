// Simple test to verify Vercel Sandbox functionality
import { Sandbox } from "@vercel/sandbox";

async function testSandbox() {
  console.log("Creating Vercel Sandbox...");
  
  try {
    const sandbox = await Sandbox.create();
    console.log(`✅ Sandbox created: ${sandbox.sandboxId}`);
    
    console.log("Running test command: console.log('Hello from Vercel Sandbox!')");
    const result = await sandbox.runCommand("node", ["-e", "console.log('Hello from Vercel Sandbox!')"]);
    
    console.log(`Exit code: ${result.exitCode}`);
    
    if (result.exitCode === 0) {
      const output = await result.stdout();
      console.log(`✅ Output: ${output}`);
    } else {
      const error = await result.stderr();
      console.log(`❌ Error: ${error}`);
    }
    
  } catch (error) {
    console.error(`❌ Failed to create/run sandbox: ${error}`);
  }
}

testSandbox();