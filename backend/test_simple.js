console.log('Test starting...');

try {
  const { buildSauceCautionContext } = require('./menuParsing');
  console.log('menuParsing imported successfully');
  
  const result = buildSauceCautionContext('BBQ wings', { gluten: true, dairy: false });
  console.log('Result:', result);
  console.log('Test completed');
} catch (error) {
  console.error('ERROR:', error.message);
  console.error(error.stack);
}

