const { LambdaClient, GetFunctionCommand } = require("@aws-sdk/client-lambda");
const fs = require("fs");
const path = require("path");
const https = require("https");
const { execSync } = require("child_process");

const lambdas = [
    { FuncName: "CommunityHandler", File: "community.js" },
    { FuncName: "UserProfileHandler", File: "profile.js" },
    { FuncName: "CloudSyncHandler", File: "sync.js" },
    { FuncName: "CreateMerchant", File: "createMerchant.js" },
    { FuncName: "UpdateMerchant", File: "updateMerchant.js" },
    { FuncName: "GetMerchantById", File: "getMerchantById.js" },
    { FuncName: "GetMerchants", File: "getMerchants.js" },
    { FuncName: "OcrDetectText", File: "ocr.js" }
];

const REGION = "ap-southeast-1";
const client = new LambdaClient({ region: REGION });

async function download(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            response.pipe(file);
            file.on("finish", () => {
                file.close();
                resolve();
            });
        }).on("error", (err) => {
            fs.unlink(dest, () => { });
            reject(err);
        });
    });
}

async function sync() {
    const tempDir = path.join(__dirname, "temp_download");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

    for (const l of lambdas) {
        console.log(`Getting ${l.FuncName}...`);
        try {
            const command = new GetFunctionCommand({ FunctionName: l.FuncName });
            const response = await client.send(command);
            const url = response.Code.Location;
            const zipPath = path.join(tempDir, `${l.FuncName}.zip`);

            await download(url, zipPath);
            console.log(`Downloaded ${l.FuncName}.zip`);

            // Use powershell to extract because it's available on windows
            const extractDir = path.join(tempDir, l.FuncName);
            if (!fs.existsSync(extractDir)) fs.mkdirSync(extractDir);
            execSync(`powershell -Command \"Expand-Archive -Path '${zipPath}' -DestinationPath '${extractDir}' -Force\"`);

            const sourceFile = path.join(extractDir, l.File);
            if (fs.existsSync(sourceFile)) {
                const targetFile = path.join(__dirname, "aws", "lambda", l.File);
                fs.copyFileSync(sourceFile, targetFile);
                console.log(`Updated local ${l.File} from ${l.FuncName}`);
            }
        } catch (e) {
            console.error(`Error syncing ${l.FuncName}:`, e.message);
        }
    }
    // Clean up tempDir
    // execSync(`powershell Remove-Item -Path "${tempDir}" -Recurse -Force`);
}

sync();
