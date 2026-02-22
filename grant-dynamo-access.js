const { execSync } = require('child_process');

try {
    console.log("Fetching lambda functions...");
    const out = execSync('aws lambda list-functions --output json', { encoding: 'utf8' });
    const functions = JSON.parse(out).Functions;

    // The policy to attach which gives DynamoDB access
    const policyArn = 'arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess';
    const attachedRoles = new Set();

    for (const fn of functions) {
        // Find role name from ARN: arn:aws:iam::123456789012:role/RoleName
        const roleArn = fn.Role;
        const roleName = roleArn.split(':role/')[1];
        if (!roleName) continue;

        if (!attachedRoles.has(roleName)) {
            attachedRoles.add(roleName);
            console.log(`Attaching policy to role: ${roleName}`);
            try {
                execSync(`aws iam attach-role-policy --role-name "${roleName}" --policy-arn "${policyArn}"`, { encoding: 'utf8' });
                console.log(`Successfully attached to ${roleName}`);
            } catch (err) {
                console.error(`Failed to attach to ${roleName}:`, err.message);
            }
        }
    }
} catch (e) {
    console.error(e);
}
