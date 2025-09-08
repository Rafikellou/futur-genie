// Script de test pour verifier la configuration OpenAI
const OpenAI = require('openai');
require('dotenv').config({ path: '.env.local' });

async function testOpenAI() {
  console.log('Test de la configuration OpenAI...\n');
  
  // Verifier les variables d environnement
  console.log('Verification des variables d environnement:');
  console.log(`OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? 'Definie' : 'Manquante'}`);
  
  if (!process.env.OPENAI_API_KEY) {
    console.log('\nErreur: OPENAI_API_KEY n est pas definie dans .env.local');
    console.log('Veuillez ajouter votre cle API OpenAI dans le fichier .env.local');
    return;
  }
  
  // Masquer la cle pour la securite
  const maskedKey = process.env.OPENAI_API_KEY.substring(0, 7) + '...' + process.env.OPENAI_API_KEY.slice(-4);
  console.log(`Cle API: ${maskedKey}\n`);
  
  // Initialiser le client OpenAI
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  
  try {
    console.log('Test de connexion avec gpt-4o-mini...');
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Tu es un assistant de test. Reponds brievement.' },
        { role: 'user', content: 'Dis juste "Test reussi" si tu me recois.' }
      ],
      max_tokens: 50,
      temperature: 0.3
    });
    
    const response = completion.choices[0]?.message?.content?.trim();
    console.log(`Reponse recue: "${response}"`);
    console.log(`Tokens utilises: ${completion.usage?.total_tokens || 'N/A'}`);
    
    // Test avec gpt-4o si disponible
    console.log('\nTest de connexion avec gpt-4o...');
    try {
      const completion4o = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'Tu es un assistant de test. Reponds brievement.' },
          { role: 'user', content: 'Dis juste "Test GPT-4o reussi" si tu me recois.' }
        ],
        max_tokens: 50,
        temperature: 0.3
      });
      
      const response4o = completion4o.choices[0]?.message?.content?.trim();
      console.log(`GPT-4o disponible: "${response4o}"`);
      console.log(`Tokens utilises: ${completion4o.usage?.total_tokens || 'N/A'}`);
    } catch (error) {
      console.log(`GPT-4o non disponible: ${error.message}`);
      console.log('Ceci est normal si votre compte n a pas acces a GPT-4o');
    }
    
    console.log('\nConfiguration OpenAI fonctionnelle !');
    console.log('Vous pouvez maintenant utiliser l assistant de creation de quiz');
    
  } catch (error) {
    console.log('\nErreur lors du test OpenAI:');
    console.log(`Type: ${error.type || 'N/A'}`);
    console.log(`Code: ${error.code || 'N/A'}`);
    console.log(`Message: ${error.message}`);
    console.log(`Status: ${error.status || 'N/A'}`);
    
    // Suggestions basees sur le type d erreur
    if (error.code === 'invalid_api_key') {
      console.log('\nSolution: Verifiez que votre cle API OpenAI est correcte');
    } else if (error.code === 'insufficient_quota') {
      console.log('\nSolution: Verifiez votre quota OpenAI sur platform.openai.com');
    } else if (error.status === 429) {
      console.log('\nSolution: Attendez quelques secondes et reessayez');
    } else if (error.status >= 500) {
      console.log('\nSolution: Probleme serveur OpenAI, reessayez plus tard');
    }
  }
}

testOpenAI().catch(console.error);
