require('dotenv').config();
async function checkSchema() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL + '/rest/v1/?apikey=' + process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  const res = await fetch(url);
  const json = await res.json();
  console.log("JSON:", json);
}
checkSchema().catch(console.error);
