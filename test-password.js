const bcrypt = require('bcryptjs');

const plainPassword = 'ClickProps@2026';
const hashFromDb = '$2a$10$3r8RPmKPKc1OgK0m2rwRkOD9n5HVocF7u3chPpuiJS6DbgWHD2Wuu';

async function testPassword() {
  try {
    console.log('Testing password...');
    const isValid = await bcrypt.compare(plainPassword, hashFromDb);
    console.log('Password valid:', isValid);
  } catch (error) {
    console.error('Error comparing passwords:', error.message);
  }
}

testPassword();
