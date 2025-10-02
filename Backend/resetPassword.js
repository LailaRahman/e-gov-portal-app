import bcrypt from 'bcrypt';
import { User } from './models/index.js';  // Adjust this path if needed

async function resetPassword() {
  const newPassword = 'test1234';  // New password you want to set
  const hashed = await bcrypt.hash(newPassword, 12);

  const user = await User.findOne({ where: { email: 'hello888@gmail.com' } });
  if (!user) {
    console.log('User not found');
    return;
  }

  user.password = hashed;
  await user.save();

  console.log('Password reset to:', newPassword);
}

resetPassword()
  .then(() => process.exit())
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
