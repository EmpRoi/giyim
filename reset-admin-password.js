const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto
    .scryptSync(password, salt, 64)
    .toString('hex');
  return `${salt}:${hash}`;
}

async function resetAdminPassword() {
  const usersPath = path.join(__dirname, 'data', 'users.json');
  
  try {
    const usersData = await fs.readFile(usersPath, 'utf8');
    let users = JSON.parse(usersData);
    
    const hashedPassword = await hashPassword("admin123");
    
    if (users.length > 0) {
      users[0].passwordHash = hashedPassword;
      await fs.writeFile(usersPath, JSON.stringify(users, null, 2));
      
      console.log("✓ Admin password updated successfully!");
      console.log("Email:", users[0].email);
      console.log("Password: admin123");
      console.log("Please login with these credentials.");
    } else {
      console.log("Error: No users found in users.json");
    }
  } catch (error) {
    console.error("Error updating admin password:", error.message);
  }
}

resetAdminPassword();
