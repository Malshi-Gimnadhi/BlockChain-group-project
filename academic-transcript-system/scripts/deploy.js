import hre from "hardhat";
import fs from "fs";

async function main() {
  console.log("Starting deployment...");
  
  // Get the contract factory
  const AcademicTranscript = await hre.ethers. getContractFactory("AcademicTranscript");
  
  // Deploy the contract
  console.log("Deploying AcademicTranscript contract...");
  const academicTranscript = await AcademicTranscript.deploy();
  
  await academicTranscript.waitForDeployment();
  
  const contractAddress = await academicTranscript.getAddress();
  console.log("✅ AcademicTranscript deployed to:", contractAddress);
  
  console.log("Deployment completed successfully!");
  
  // Save deployment info
  const deploymentInfo = {
    contractAddress:  contractAddress,
    network: hre.network.name,
    deployedAt: new Date().toISOString()
  };
  
  fs.writeFileSync(
    './deployment-info.json',
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("Deployment info saved to deployment-info.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});