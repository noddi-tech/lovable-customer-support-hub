import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// Pre-bundled widget JavaScript - this is the complete standalone widget
const WIDGET_JS = `
(function() {
  'use strict';
  
  console.log('[Noddi] Widget script loaded at', new Date().toISOString());
  // ========== TRANSLATIONS ==========
  const translations = {
    en: {"messageSent":"Message sent!","wellGetBack":"We'll get back to you as soon as possible.","startingChat":"Starting chat...","startLiveChat":"Start live chat","online":"Online","offline":"We're currently offline","leaveMessage":"Leave a message and we'll get back to you","sendMessage":"Send us a message","searchAnswers":"Search our help center","back":"Back","poweredBy":"Powered by Noddi","name":"Name","yourName":"Your name","email":"Email","message":"Message","howCanWeHelp":"How can we help?","fillAllFields":"Please fill in all fields","invalidEmail":"Please enter a valid email address","sending":"Sending...","sendMessageBtn":"Send Message","searchPlaceholder":"Search for answers...","searchKnowledgeBase":"Search our knowledge base for quick answers","noResults":"No results found for","tryDifferentKeywords":"Try different keywords or ask us directly","chatEnded":"Chat ended","waitingForAgent":"Waiting for agent...","chattingWith":"Chatting with","connected":"Connected","endChat":"End chat","startConversation":"Start the conversation by sending a message below.","typeMessage":"Type a message...","thankYou":"This chat has ended. Thank you for contacting us!","startNewConversation":"Start new conversation","changeLanguage":"Change language","defaultGreeting":"Hi there! 👋 How can we help you today?","defaultResponseTime":"We usually respond within a few hours","enterEmailToContinue":"Enter your email to start chatting","emailRequired":"Email is required to start a chat","optional":"Optional","startChat":"Start Chat"},
    no: {"messageSent":"Melding sendt!","wellGetBack":"Vi svarer deg så snart som mulig.","startingChat":"Starter chat...","startLiveChat":"Start live chat","online":"Tilgjengelig","offline":"Vi er for øyeblikket offline","leaveMessage":"Legg igjen en melding, så svarer vi snart","sendMessage":"Send oss en melding","searchAnswers":"Søk i hjelpesenteret","back":"Tilbake","poweredBy":"Drevet av Noddi","name":"Navn","yourName":"Ditt navn","email":"E-post","message":"Melding","howCanWeHelp":"Hvordan kan vi hjelpe?","fillAllFields":"Vennligst fyll ut alle felt","invalidEmail":"Vennligst skriv inn en gyldig e-postadresse","sending":"Sender...","sendMessageBtn":"Send melding","searchPlaceholder":"Søk etter svar...","searchKnowledgeBase":"Søk i vår kunnskapsbase for raske svar","noResults":"Ingen resultater funnet for","tryDifferentKeywords":"Prøv andre søkeord eller kontakt oss direkte","chatEnded":"Chat avsluttet","waitingForAgent":"Venter på agent...","chattingWith":"Chatter med","connected":"Tilkoblet","endChat":"Avslutt chat","startConversation":"Start samtalen ved å sende en melding nedenfor.","typeMessage":"Skriv en melding...","thankYou":"Denne chatten er avsluttet. Takk for at du kontaktet oss!","startNewConversation":"Start ny samtale","changeLanguage":"Bytt språk","defaultGreeting":"Hei! 👋 Hvordan kan vi hjelpe deg i dag?","defaultResponseTime":"Vi svarer vanligvis innen noen timer","enterEmailToContinue":"Skriv inn e-posten din for å starte chat","emailRequired":"E-post er påkrevd for å starte en chat","optional":"Valgfritt","startChat":"Start chat"},
    es: {"messageSent":"¡Mensaje enviado!","wellGetBack":"Te responderemos lo antes posible.","startingChat":"Iniciando chat...","startLiveChat":"Iniciar chat en vivo","online":"En línea","offline":"Actualmente no estamos disponibles","leaveMessage":"Deja un mensaje y te responderemos","sendMessage":"Envíanos un mensaje","searchAnswers":"Buscar en el centro de ayuda","back":"Atrás","poweredBy":"Impulsado por Noddi","name":"Nombre","yourName":"Tu nombre","email":"Correo electrónico","message":"Mensaje","howCanWeHelp":"¿Cómo podemos ayudarte?","fillAllFields":"Por favor completa todos los campos","invalidEmail":"Por favor ingresa un correo electrónico válido","sending":"Enviando...","sendMessageBtn":"Enviar mensaje","searchPlaceholder":"Buscar respuestas...","searchKnowledgeBase":"Busca en nuestra base de conocimientos para respuestas rápidas","noResults":"No se encontraron resultados para","tryDifferentKeywords":"Prueba con otras palabras clave o contáctanos directamente","chatEnded":"Chat terminado","waitingForAgent":"Esperando agente...","chattingWith":"Chateando con","connected":"Conectado","endChat":"Terminar chat","startConversation":"Inicia la conversación enviando un mensaje a continuación.","typeMessage":"Escribe un mensaje...","thankYou":"Este chat ha terminado. ¡Gracias por contactarnos!","startNewConversation":"Iniciar nueva conversación","changeLanguage":"Cambiar idioma","defaultGreeting":"¡Hola! 👋 ¿Cómo podemos ayudarte hoy?","defaultResponseTime":"Normalmente respondemos en pocas horas","enterEmailToContinue":"Ingresa tu correo para iniciar el chat","emailRequired":"Se requiere correo electrónico para iniciar el chat","optional":"Opcional","startChat":"Iniciar chat"},
    fr: {"messageSent":"Message envoyé !","wellGetBack":"Nous vous répondrons dès que possible.","startingChat":"Démarrage du chat...","startLiveChat":"Démarrer le chat en direct","online":"En ligne","offline":"Nous sommes actuellement hors ligne","leaveMessage":"Laissez un message et nous vous répondrons","sendMessage":"Envoyez-nous un message","searchAnswers":"Rechercher dans le centre d'aide","back":"Retour","poweredBy":"Propulsé par Noddi","name":"Nom","yourName":"Votre nom","email":"E-mail","message":"Message","howCanWeHelp":"Comment pouvons-nous vous aider ?","fillAllFields":"Veuillez remplir tous les champs","invalidEmail":"Veuillez entrer une adresse e-mail valide","sending":"Envoi...","sendMessageBtn":"Envoyer le message","searchPlaceholder":"Rechercher des réponses...","searchKnowledgeBase":"Recherchez dans notre base de connaissances pour des réponses rapides","noResults":"Aucun résultat trouvé pour","tryDifferentKeywords":"Essayez d'autres mots-clés ou contactez-nous directement","chatEnded":"Chat terminé","waitingForAgent":"En attente d'un agent...","chattingWith":"Discussion avec","connected":"Connecté","endChat":"Terminer le chat","startConversation":"Commencez la conversation en envoyant un message ci-dessous.","typeMessage":"Tapez un message...","thankYou":"Ce chat est terminé. Merci de nous avoir contactés !","startNewConversation":"Démarrer une nouvelle conversation","changeLanguage":"Changer de langue","defaultGreeting":"Bonjour ! 👋 Comment pouvons-nous vous aider aujourd'hui ?","defaultResponseTime":"Nous répondons généralement en quelques heures","enterEmailToContinue":"Entrez votre e-mail pour commencer le chat","emailRequired":"L'e-mail est requis pour démarrer le chat","optional":"Facultatif","startChat":"Démarrer le chat"},
    de: {"messageSent":"Nachricht gesendet!","wellGetBack":"Wir melden uns so schnell wie möglich bei Ihnen.","startingChat":"Chat wird gestartet...","startLiveChat":"Live-Chat starten","online":"Online","offline":"Wir sind derzeit offline","leaveMessage":"Hinterlassen Sie eine Nachricht und wir melden uns","sendMessage":"Senden Sie uns eine Nachricht","searchAnswers":"Im Hilfecenter suchen","back":"Zurück","poweredBy":"Bereitgestellt von Noddi","name":"Name","yourName":"Ihr Name","email":"E-Mail","message":"Nachricht","howCanWeHelp":"Wie können wir Ihnen helfen?","fillAllFields":"Bitte füllen Sie alle Felder aus","invalidEmail":"Bitte geben Sie eine gültige E-Mail-Adresse ein","sending":"Wird gesendet...","sendMessageBtn":"Nachricht senden","searchPlaceholder":"Nach Antworten suchen...","searchKnowledgeBase":"Durchsuchen Sie unsere Wissensdatenbank für schnelle Antworten","noResults":"Keine Ergebnisse gefunden für","tryDifferentKeywords":"Versuchen Sie andere Suchbegriffe oder kontaktieren Sie uns direkt","chatEnded":"Chat beendet","waitingForAgent":"Warten auf einen Mitarbeiter...","chattingWith":"Im Gespräch mit","connected":"Verbunden","endChat":"Chat beenden","startConversation":"Starten Sie das Gespräch, indem Sie unten eine Nachricht senden.","typeMessage":"Nachricht eingeben...","thankYou":"Dieser Chat wurde beendet. Vielen Dank für Ihre Kontaktaufnahme!","startNewConversation":"Neues Gespräch starten","changeLanguage":"Sprache ändern","defaultGreeting":"Hallo! 👋 Wie können wir Ihnen heute helfen?","defaultResponseTime":"Wir antworten normalerweise innerhalb weniger Stunden","enterEmailToContinue":"E-Mail eingeben um den Chat zu starten","emailRequired":"E-Mail ist erforderlich um den Chat zu starten","optional":"Optional","startChat":"Chat starten"},
    it: {"messageSent":"Messaggio inviato!","wellGetBack":"Ti risponderemo il prima possibile.","startingChat":"Avvio chat...","startLiveChat":"Avvia chat dal vivo","online":"Online","offline":"Siamo attualmente offline","leaveMessage":"Lascia un messaggio e ti risponderemo","sendMessage":"Inviaci un messaggio","searchAnswers":"Cerca nel centro assistenza","back":"Indietro","poweredBy":"Powered by Noddi","name":"Nome","yourName":"Il tuo nome","email":"E-mail","message":"Messaggio","howCanWeHelp":"Come possiamo aiutarti?","fillAllFields":"Per favore compila tutti i campi","invalidEmail":"Per favore inserisci un indirizzo e-mail valido","sending":"Invio in corso...","sendMessageBtn":"Invia messaggio","searchPlaceholder":"Cerca risposte...","searchKnowledgeBase":"Cerca nella nostra knowledge base per risposte rapide","noResults":"Nessun risultato trovato per","tryDifferentKeywords":"Prova con parole chiave diverse o contattaci direttamente","chatEnded":"Chat terminata","waitingForAgent":"In attesa di un agente...","chattingWith":"In chat con","connected":"Connesso","endChat":"Termina chat","startConversation":"Inizia la conversazione inviando un messaggio qui sotto.","typeMessage":"Scrivi un messaggio...","thankYou":"Questa chat è terminata. Grazie per averci contattato!","startNewConversation":"Inizia nuova conversazione","changeLanguage":"Cambia lingua","defaultGreeting":"Ciao! 👋 Come possiamo aiutarti oggi?","defaultResponseTime":"Di solito rispondiamo entro poche ore","enterEmailToContinue":"Inserisci la tua email per iniziare la chat","emailRequired":"L'email è richiesta per iniziare la chat","optional":"Opzionale","startChat":"Inizia chat"},
    pt: {"messageSent":"Mensagem enviada!","wellGetBack":"Responderemos o mais breve possível.","startingChat":"Iniciando chat...","startLiveChat":"Iniciar chat ao vivo","online":"Online","offline":"Estamos atualmente offline","leaveMessage":"Deixe uma mensagem e responderemos","sendMessage":"Envie-nos uma mensagem","searchAnswers":"Pesquisar no centro de ajuda","back":"Voltar","poweredBy":"Desenvolvido por Noddi","name":"Nome","yourName":"Seu nome","email":"E-mail","message":"Mensagem","howCanWeHelp":"Como podemos ajudar?","fillAllFields":"Por favor, preencha todos os campos","invalidEmail":"Por favor, insira um endereço de e-mail válido","sending":"Enviando...","sendMessageBtn":"Enviar mensagem","searchPlaceholder":"Pesquisar respostas...","searchKnowledgeBase":"Pesquise em nossa base de conhecimento para respostas rápidas","noResults":"Nenhum resultado encontrado para","tryDifferentKeywords":"Tente palavras-chave diferentes ou entre em contato diretamente","chatEnded":"Chat encerrado","waitingForAgent":"Aguardando agente...","chattingWith":"Conversando com","connected":"Conectado","endChat":"Encerrar chat","startConversation":"Inicie a conversa enviando uma mensagem abaixo.","typeMessage":"Digite uma mensagem...","thankYou":"Este chat foi encerrado. Obrigado por entrar em contato!","startNewConversation":"Iniciar nova conversa","changeLanguage":"Mudar idioma","defaultGreeting":"Olá! 👋 Como podemos ajudá-lo hoje?","defaultResponseTime":"Normalmente respondemos em poucas horas","enterEmailToContinue":"Digite seu e-mail para iniciar o chat","emailRequired":"E-mail é obrigatório para iniciar o chat","optional":"Opcional","startChat":"Iniciar chat"},
    nl: {"messageSent":"Bericht verzonden!","wellGetBack":"We nemen zo snel mogelijk contact met je op.","startingChat":"Chat starten...","startLiveChat":"Start live chat","online":"Online","offline":"We zijn momenteel offline","leaveMessage":"Laat een bericht achter en we nemen contact op","sendMessage":"Stuur ons een bericht","searchAnswers":"Zoek in het helpcentrum","back":"Terug","poweredBy":"Mogelijk gemaakt door Noddi","name":"Naam","yourName":"Je naam","email":"E-mail","message":"Bericht","howCanWeHelp":"Hoe kunnen we je helpen?","fillAllFields":"Vul alsjeblieft alle velden in","invalidEmail":"Voer alsjeblieft een geldig e-mailadres in","sending":"Verzenden...","sendMessageBtn":"Bericht verzenden","searchPlaceholder":"Zoek naar antwoorden...","searchKnowledgeBase":"Doorzoek onze kennisbank voor snelle antwoorden","noResults":"Geen resultaten gevonden voor","tryDifferentKeywords":"Probeer andere zoekwoorden of neem direct contact op","chatEnded":"Chat beëindigd","waitingForAgent":"Wachten op medewerker...","chattingWith":"In gesprek met","connected":"Verbonden","endChat":"Chat beëindigen","startConversation":"Begin het gesprek door hieronder een bericht te sturen.","typeMessage":"Typ een bericht...","thankYou":"Deze chat is beëindigd. Bedankt voor je contact!","startNewConversation":"Nieuw gesprek starten","changeLanguage":"Taal wijzigen","defaultGreeting":"Hallo! 👋 Hoe kunnen we je vandaag helpen?","defaultResponseTime":"We reageren meestal binnen enkele uren","enterEmailToContinue":"Voer je e-mail in om de chat te starten","emailRequired":"E-mail is vereist om de chat te starten","optional":"Optioneel","startChat":"Start chat"},
    sv: {"messageSent":"Meddelande skickat!","wellGetBack":"Vi återkommer så snart som möjligt.","startingChat":"Startar chatt...","startLiveChat":"Starta livechatt","online":"Online","offline":"Vi är för närvarande offline","leaveMessage":"Lämna ett meddelande så återkommer vi","sendMessage":"Skicka ett meddelande","searchAnswers":"Sök i hjälpcentret","back":"Tillbaka","poweredBy":"Drivs av Noddi","name":"Namn","yourName":"Ditt namn","email":"E-post","message":"Meddelande","howCanWeHelp":"Hur kan vi hjälpa dig?","fillAllFields":"Vänligen fyll i alla fält","invalidEmail":"Vänligen ange en giltig e-postadress","sending":"Skickar...","sendMessageBtn":"Skicka meddelande","searchPlaceholder":"Sök efter svar...","searchKnowledgeBase":"Sök i vår kunskapsbas för snabba svar","noResults":"Inga resultat hittades för","tryDifferentKeywords":"Prova andra sökord eller kontakta oss direkt","chatEnded":"Chatt avslutad","waitingForAgent":"Väntar på agent...","chattingWith":"Chattar med","connected":"Ansluten","endChat":"Avsluta chatt","startConversation":"Starta konversationen genom att skicka ett meddelande nedan.","typeMessage":"Skriv ett meddelande...","thankYou":"Denna chatt har avslutats. Tack för att du kontaktade oss!","startNewConversation":"Starta ny konversation","changeLanguage":"Byt språk","defaultGreeting":"Hej! 👋 Hur kan vi hjälpa dig idag?","defaultResponseTime":"Vi svarar vanligtvis inom några timmar","enterEmailToContinue":"Ange din e-post för att starta chatten","emailRequired":"E-post krävs för att starta chatten","optional":"Valfritt","startChat":"Starta chatt"},
    da: {"messageSent":"Besked sendt!","wellGetBack":"Vi vender tilbage hurtigst muligt.","startingChat":"Starter chat...","startLiveChat":"Start live chat","online":"Online","offline":"Vi er i øjeblikket offline","leaveMessage":"Efterlad en besked, så vender vi tilbage","sendMessage":"Send os en besked","searchAnswers":"Søg i hjælpecenteret","back":"Tilbage","poweredBy":"Drevet af Noddi","name":"Navn","yourName":"Dit navn","email":"E-mail","message":"Besked","howCanWeHelp":"Hvordan kan vi hjælpe?","fillAllFields":"Udfyld venligst alle felter","invalidEmail":"Indtast venligst en gyldig e-mailadresse","sending":"Sender...","sendMessageBtn":"Send besked","searchPlaceholder":"Søg efter svar...","searchKnowledgeBase":"Søg i vores vidensbase for hurtige svar","noResults":"Ingen resultater fundet for","tryDifferentKeywords":"Prøv andre søgeord eller kontakt os direkte","chatEnded":"Chat afsluttet","waitingForAgent":"Venter på agent...","chattingWith":"Chatter med","connected":"Forbundet","endChat":"Afslut chat","startConversation":"Start samtalen ved at sende en besked nedenfor.","typeMessage":"Skriv en besked...","thankYou":"Denne chat er afsluttet. Tak fordi du kontaktede os!","startNewConversation":"Start ny samtale","changeLanguage":"Skift sprog","defaultGreeting":"Hej! 👋 Hvordan kan vi hjælpe dig i dag?","defaultResponseTime":"Vi svarer normalt inden for få timer","enterEmailToContinue":"Indtast din e-mail for at starte chatten","emailRequired":"E-mail er påkrævet for at starte chatten","optional":"Valgfrit","startChat":"Start chat"}
  };

  const SUPPORTED_LANGUAGES = [
    { code: 'no', name: 'Norsk', flag: '🇳🇴' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' },
    { code: 'pt', name: 'Português', flag: '🇵🇹' },
    { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
    { code: 'sv', name: 'Svenska', flag: '🇸🇪' },
    { code: 'da', name: 'Dansk', flag: '🇩🇰' }
  ];

  function getT(lang) {
    return translations[lang] || translations.en;
  }

  // ========== CSS ==========
  const CSS = \`
.noddi-widget-container{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:14px;line-height:1.5;color:#1f2937;-webkit-font-smoothing:antialiased}
.noddi-widget-container *{box-sizing:border-box;margin:0;padding:0}
.noddi-widget-button{position:fixed;bottom:20px;width:56px;height:56px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#fff;box-shadow:0 4px 12px rgba(0,0,0,.15);transition:transform .2s,box-shadow .2s;z-index:999998}
.noddi-widget-button:hover{transform:scale(1.05);box-shadow:0 6px 20px rgba(0,0,0,.2)}
.noddi-widget-button:active{transform:scale(.95)}
.noddi-widget-panel{position:fixed;bottom:90px;width:380px;max-width:calc(100vw - 40px);max-height:calc(100vh - 120px);background:#fff;border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,.15);display:flex;flex-direction:column;overflow:hidden;z-index:999999;animation:noddi-slide-up .3s ease}
@keyframes noddi-slide-up{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes noddi-spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
.noddi-widget-header{padding:16px 20px;color:#fff;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.noddi-widget-header-content{display:flex;align-items:center;gap:12px}
.noddi-widget-header-icon{width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.noddi-widget-header-icon svg{width:18px;height:18px}
.noddi-widget-logo{width:32px;height:32px;border-radius:50%;object-fit:cover;background:rgba(255,255,255,0.2)}
.noddi-widget-title{font-size:15px;font-weight:500;margin:0}
.noddi-widget-close{background:transparent;border:none;width:24px;height:24px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#fff;transition:opacity .2s;opacity:0.8}
.noddi-widget-close:hover{opacity:1}
.noddi-widget-content{flex:1;overflow-y:auto;padding:20px;min-height:200px}
.noddi-widget-home{display:flex;flex-direction:column;gap:16px}
.noddi-widget-greeting-container{display:flex;flex-direction:column;gap:4px}
.noddi-widget-greeting{font-size:18px;font-weight:600;color:#1f2937;line-height:1.4;margin:0}
.noddi-widget-response-time{font-size:14px;color:#6b7280;margin:0}
.noddi-widget-actions{display:flex;flex-direction:column;gap:10px}
.noddi-widget-action{display:flex;align-items:center;gap:14px;padding:14px 16px;background:#fff;border:1px solid #e5e7eb;border-radius:12px;cursor:pointer;transition:all .2s;text-align:left}
.noddi-widget-action:hover{background:#f9fafb;border-color:#d1d5db;transform:translateY(-1px);box-shadow:0 2px 8px rgba(0,0,0,.05)}
.noddi-widget-action-icon{width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.noddi-widget-action-icon svg{width:20px;height:20px}
.noddi-widget-action-text{display:flex;flex-direction:column;gap:2px;flex:1}
.noddi-widget-action-title{font-size:14px;font-weight:500;color:#1f2937}
.noddi-widget-action-subtitle{font-size:12px;color:#6b7280}
.noddi-widget-action-primary{border-width:2px}
.noddi-widget-action-primary:hover{background:#f9fafb}
.noddi-widget-action:disabled{opacity:.6;cursor:not-allowed}
.noddi-widget-online-badge{font-size:11px;color:#22c55e;font-weight:600;display:flex;align-items:center;gap:4px}
.noddi-widget-offline-notice{display:flex;align-items:center;gap:14px;padding:16px;background:linear-gradient(135deg,#fef3c7,#fde68a);border:1px solid #fbbf24;border-radius:12px;margin-bottom:10px}
.noddi-widget-loading{display:flex;align-items:center;justify-content:center;padding:60px 20px}
.noddi-widget-loading-spinner{width:32px;height:32px;border:3px solid #e5e7eb;border-top-color:currentColor;border-radius:50%;animation:noddi-spin 0.8s linear infinite}
.noddi-widget-offline-icon{width:42px;height:42px;border-radius:50%;background:rgba(217,119,6,.15);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.noddi-widget-offline-icon svg{color:#d97706}
.noddi-widget-offline-text{display:flex;flex-direction:column;gap:2px}
.noddi-widget-offline-title{font-size:14px;font-weight:600;color:#92400e}
.noddi-widget-offline-subtitle{font-size:12px;color:#a16207}
.noddi-widget-view{display:flex;flex-direction:column;gap:12px}
.noddi-widget-back{display:inline-flex;align-items:center;gap:4px;background:none;border:none;color:#6b7280;cursor:pointer;font-size:13px;padding:4px 0;margin-bottom:4px}
.noddi-widget-back:hover{color:#374151}
.noddi-widget-form{display:flex;flex-direction:column;gap:12px}
.noddi-widget-field{display:flex;flex-direction:column;gap:4px}
.noddi-widget-field label{font-size:13px;font-weight:500;color:#374151}
.noddi-widget-field input,.noddi-widget-field textarea{padding:10px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:14px;font-family:inherit;transition:border-color .2s,box-shadow .2s;background:#fff;color:#1f2937}
.noddi-widget-field input:focus,.noddi-widget-field textarea:focus{outline:none;border-color:#9ca3af;box-shadow:0 0 0 3px rgba(156,163,175,.1)}
.noddi-widget-field input:disabled,.noddi-widget-field textarea:disabled{background:#f9fafb;cursor:not-allowed}
.noddi-widget-field textarea{resize:vertical;min-height:80px}
.noddi-widget-error{padding:10px 12px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;color:#dc2626;font-size:13px}
.noddi-widget-submit{padding:12px 16px;border:none;border-radius:8px;font-size:14px;font-weight:500;color:#fff;cursor:pointer;transition:opacity .2s;margin-top:4px}
.noddi-widget-submit:hover:not(:disabled){opacity:.9}
.noddi-widget-submit:disabled{opacity:.6;cursor:not-allowed}
.noddi-widget-search{display:flex;flex-direction:column;gap:12px}
.noddi-widget-search-form{display:flex;gap:8px}
.noddi-widget-search-input{flex:1;padding:10px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:14px;font-family:inherit;background:#fff;color:#1f2937}
.noddi-widget-search-input:focus{outline:none;border-color:#9ca3af}
.noddi-widget-search-btn{width:42px;height:42px;border:none;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0;transition:opacity .2s}
.noddi-widget-search-btn:hover:not(:disabled){opacity:.9}
.noddi-widget-search-btn:disabled{opacity:.6;cursor:not-allowed}
.noddi-widget-spinner{animation:noddi-spin 1s linear infinite}
@keyframes noddi-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
.noddi-widget-results{display:flex;flex-direction:column;gap:8px;min-height:100px}
.noddi-widget-results-placeholder,.noddi-widget-results-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center;color:#6b7280}
.noddi-widget-results-placeholder p,.noddi-widget-results-empty p{margin-top:12px;font-size:13px}
.noddi-widget-results-empty span{font-size:12px;color:#9ca3af;margin-top:4px}
.noddi-widget-result{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;cursor:pointer;transition:all .2s;overflow:hidden}
.noddi-widget-result:hover{border-color:#d1d5db}
.noddi-widget-result-header{display:flex;align-items:center;justify-content:space-between;padding:12px;gap:8px}
.noddi-widget-result-question{font-size:13px;font-weight:500;color:#374151;flex:1}
.noddi-widget-result-chevron{color:#9ca3af;transition:transform .2s;flex-shrink:0}
.noddi-widget-result.expanded .noddi-widget-result-chevron{transform:rotate(180deg)}
.noddi-widget-result-answer{padding:0 12px 12px;font-size:13px;color:#6b7280;line-height:1.6;border-top:1px solid #e5e7eb;padding-top:12px}
.noddi-widget-success{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px 16px;text-align:center}
.noddi-widget-success h4{font-size:16px;font-weight:600;color:#1f2937;margin:16px 0 8px}
.noddi-widget-success p{font-size:13px;color:#6b7280}
.noddi-widget-footer{padding:12px 16px;border-top:1px solid #e5e7eb;flex-shrink:0}
.noddi-widget-footer-content{display:flex;align-items:center;justify-content:space-between;gap:8px}
.noddi-widget-footer-content>span{font-size:11px;color:#9ca3af}
.noddi-widget-language-selector{position:relative}
.noddi-widget-language-btn{display:flex;align-items:center;gap:4px;padding:4px 8px;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:6px;cursor:pointer;font-size:11px;color:#6b7280;transition:all .2s}
.noddi-widget-language-btn:hover{background:#e5e7eb;color:#374151}
.noddi-widget-language-menu{position:absolute;bottom:100%;right:0;margin-bottom:4px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,.1);min-width:120px;max-height:200px;overflow-y:auto;z-index:10;animation:noddi-fade-in .15s ease}
@keyframes noddi-fade-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
.noddi-widget-flag{font-size:14px;line-height:1}
.noddi-widget-language-option{display:flex;align-items:center;gap:8px;width:100%;padding:8px 12px;background:none;border:none;text-align:left;font-size:12px;color:#374151;cursor:pointer;transition:background .15s}
.noddi-widget-language-option:hover{background:#f3f4f6}
.noddi-widget-language-option.active{background:#eff6ff;color:#2563eb;font-weight:500}
.noddi-widget-chat{display:flex;flex-direction:column;height:100%;min-height:350px}
.noddi-chat-status{display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid #e5e7eb;margin-bottom:12px}
.noddi-chat-status-indicator{display:flex;align-items:center;gap:8px}
.noddi-chat-status-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.noddi-chat-status-text{font-size:13px;color:#6b7280}
.noddi-chat-end-button{background:none;border:none;color:#ef4444;font-size:12px;cursor:pointer;padding:4px 8px;border-radius:4px}
.noddi-chat-end-button:hover{background:#fef2f2}
.noddi-chat-messages{flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:12px;padding:4px 0;min-height:200px}
.noddi-chat-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#9ca3af;font-size:13px;text-align:center;padding:24px;gap:8px}
.noddi-chat-message{display:flex;flex-direction:column;max-width:85%}
.noddi-chat-message-customer{align-self:flex-end;align-items:flex-end}
.noddi-chat-message-agent{align-self:flex-start;align-items:flex-start}
.noddi-chat-message-sender{font-size:11px;color:#6b7280;margin-bottom:2px;padding-left:4px}
.noddi-chat-message-bubble{padding:10px 14px;border-radius:16px;font-size:14px;line-height:1.4;word-wrap:break-word}
.noddi-chat-message-customer .noddi-chat-message-bubble{color:#fff;border-bottom-right-radius:4px}
.noddi-chat-message-agent .noddi-chat-message-bubble{background:#f3f4f6;color:#1f2937;border-bottom-left-radius:4px}
.noddi-chat-message-time{font-size:10px;color:#9ca3af;margin-top:4px;padding:0 4px}
.noddi-chat-typing{display:flex;align-items:center;gap:4px;padding:12px 16px;background:#f3f4f6;border-radius:16px;border-bottom-left-radius:4px}
.noddi-chat-typing span{width:6px;height:6px;background:#9ca3af;border-radius:50%;animation:noddi-typing-bounce 1.4s ease-in-out infinite}
.noddi-chat-typing span:nth-child(2){animation-delay:.2s}
.noddi-chat-typing span:nth-child(3){animation-delay:.4s}
@keyframes noddi-typing-bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-4px)}}
.noddi-chat-input-container{display:flex;gap:8px;padding-top:12px;border-top:1px solid #e5e7eb;margin-top:12px}
.noddi-chat-input{flex:1;padding:10px 14px;border:1px solid #e5e7eb;border-radius:24px;font-size:14px;font-family:inherit;background:#fff;color:#1f2937}
.noddi-chat-input:focus{outline:none;border-color:#9ca3af}
.noddi-chat-input:disabled{background:#f9fafb;cursor:not-allowed}
.noddi-chat-send{width:42px;height:42px;border:none;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0;transition:opacity .2s,transform .2s}
.noddi-chat-send:hover:not(:disabled){opacity:.9;transform:scale(1.05)}
.noddi-chat-send:disabled{opacity:.5;cursor:not-allowed}
.noddi-chat-ended{display:flex;flex-direction:column;align-items:center;text-align:center;padding:24px 16px;border-top:1px solid #e5e7eb;margin-top:auto;gap:12px}
.noddi-chat-ended p{font-size:14px;color:#374151;margin:0}
.noddi-chat-new-button{padding:12px 24px;border:none;border-radius:8px;font-size:14px;font-weight:500;color:#fff;cursor:pointer;transition:opacity .2s;width:100%;max-width:280px}
.noddi-chat-new-button:hover{opacity:.9}
.noddi-chat-skip-button{padding:10px 20px;border:1px solid #e5e7eb;border-radius:8px;background:#fff;color:#6b7280;font-size:14px;cursor:pointer;transition:all .2s;width:100%;max-width:280px}
.noddi-chat-skip-button:hover{background:#f3f4f6;border-color:#d1d5db;color:#374151}
@media (max-width:420px){.noddi-widget-panel{width:calc(100vw - 20px);left:10px!important;right:10px!important;bottom:80px;max-height:calc(100vh - 100px)}.noddi-widget-button{width:50px;height:50px}}
\`;

  // ========== SVG ICONS ==========
  const icons = {
    chat: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>',
    close: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
    back: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>',
    mail: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>',
    search: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>',
    clock: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path></svg>',
    check: '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
    chevron: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>',
    send: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>',
    spinner: '<svg class="noddi-widget-spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" opacity="0.25"></circle><path d="M12 2a10 10 0 0 1 10 10" opacity="0.75"></path></svg>'
  };

  // ========== STATE ==========
  let apiUrl = '';
  let config = null;
  let configLoading = false;
  let state = {
    isOpen: false,
    view: 'home',
    lang: 'no',
    showSuccess: false,
    showLangMenu: false,
    chatSession: null,
    chatMessages: [],
    agentTyping: false,
    searchResults: [],
    hasSearched: false,
    expandedResult: null,
    isLoading: false,
    error: null,
    prechatEmail: '',
    prechatName: '',
    showTranscriptPrompt: false,
    transcriptSending: false,
    transcriptSent: false
  };
  let pollInterval = null;
  let heartbeatInterval = null;
  let container = null;

  // ========== API ==========
  async function fetchConfig(widgetKey) {
    try {
      const res = await fetch(apiUrl + '/widget-config?key=' + encodeURIComponent(widgetKey));
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      console.error('[Noddi] Config error:', e);
      return null;
    }
  }

  async function submitForm(data) {
    try {
      const res = await fetch(apiUrl + '/widget-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return res.ok ? { success: true } : { success: false, error: 'Failed to send' };
    } catch (e) {
      return { success: false, error: 'Network error' };
    }
  }

  async function searchFaq(widgetKey, query) {
    try {
      const res = await fetch(apiUrl + '/widget-search-faq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ widgetKey, query })
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.results || [];
    } catch (e) {
      return [];
    }
  }

  async function startChat(widgetKey, visitorId, visitorEmail, visitorName) {
    try {
      const res = await fetch(apiUrl + '/widget-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', widgetKey, visitorId, visitorEmail, visitorName, pageUrl: window.location.href })
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      return null;
    }
  }

  async function sendPing(sessionId) {
    try {
      await fetch(apiUrl + '/widget-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ping', sessionId })
      });
    } catch (e) {}
  }

  async function sendMessage(sessionId, content) {
    try {
      const res = await fetch(apiUrl + '/widget-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'message', sessionId, content })
      });
      return res.ok ? await res.json() : null;
    } catch (e) {
      return null;
    }
  }

  async function getMessages(sessionId) {
    try {
      const res = await fetch(apiUrl + '/widget-chat?sessionId=' + encodeURIComponent(sessionId));
      if (!res.ok) return { messages: [] };
      return await res.json();
    } catch (e) {
      return { messages: [] };
    }
  }

  async function endChatSession(sessionId) {
    try {
      await fetch(apiUrl + '/widget-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'end', sessionId })
      });
    } catch (e) {}
  }

  // ========== HELPERS ==========
  function getVisitorId() {
    let id = localStorage.getItem('noddi_visitor_id');
    if (!id) {
      id = 'v_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      localStorage.setItem('noddi_visitor_id', id);
    }
    return id;
  }

  // Session persistence helpers
  function saveSession(session) {
    if (session) {
      localStorage.setItem('noddi_chat_session', JSON.stringify(session));
    }
  }

  function getSavedSession() {
    try {
      const saved = localStorage.getItem('noddi_chat_session');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  }

  function clearSavedSession() {
    localStorage.removeItem('noddi_chat_session');
  }

  // Incremental DOM update for chat messages only (avoids full re-render flickering)
  function renderChatMessages() {
    const messagesContainer = container?.querySelector('.noddi-chat-messages');
    const statusText = container?.querySelector('.noddi-chat-status-text');
    const statusDot = container?.querySelector('.noddi-chat-status-dot');
    const t = getT(state.lang);
    
    if (!messagesContainer) return;
    
    const session = state.chatSession;
    const isEnded = session && (session.status === 'ended' || session.status === 'abandoned');
    
    // Update status indicators
    if (statusText) {
      statusText.textContent = isEnded ? t.chatEnded : (session && session.status === 'waiting' ? t.waitingForAgent : t.connected);
    }
    if (statusDot) {
      statusDot.style.backgroundColor = isEnded ? '#ef4444' : (session && session.status === 'active' ? '#22c55e' : '#f59e0b');
    }
    
    // Build messages HTML
    let html = '';
    if (state.chatMessages.length === 0 && !isEnded) {
      html += '<div class="noddi-chat-empty"><p>' + t.startConversation + '</p></div>';
    }
    state.chatMessages.forEach(m => {
      const isCustomer = m.senderType === 'customer';
      html += '<div class="noddi-chat-message noddi-chat-message-' + (isCustomer ? 'customer' : 'agent') + '">';
      if (!isCustomer && m.senderName) html += '<span class="noddi-chat-message-sender">' + m.senderName + '</span>';
      html += '<div class="noddi-chat-message-bubble"' + (isCustomer ? ' style="background-color:' + config.primaryColor + '"' : '') + '>' + m.content + '</div>';
      html += '<span class="noddi-chat-message-time">' + new Date(m.createdAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) + '</span>';
      html += '</div>';
    });
    if (state.agentTyping) {
      html += '<div class="noddi-chat-message noddi-chat-message-agent"><div class="noddi-chat-typing"><span></span><span></span><span></span></div></div>';
    }
    
    messagesContainer.innerHTML = html;
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // If chat ended, do a full re-render to show end state
    if (isEnded) {
      render();
    }
  }

  function getStoredLang() {
    return localStorage.getItem('noddi_widget_language');
  }

  function setStoredLang(code) {
    localStorage.setItem('noddi_widget_language', code);
  }

  function getLocalizedText(text, defaultText, lang, customTranslations) {
    if (customTranslations && customTranslations[lang]) return customTranslations[lang];
    const defaults = { en: defaultText };
    if (text === defaults.en || text === getT('en').defaultGreeting || text === getT('en').defaultResponseTime) {
      const t = getT(lang);
      if (text.includes('👋')) return t.defaultGreeting;
      if (text.includes('respond')) return t.defaultResponseTime;
    }
    return text;
  }

  // ========== RENDER ==========
  function render() {
    if (!container) return;

    const t = getT(state.lang);
    const currentLang = SUPPORTED_LANGUAGES.find(l => l.code === state.lang) || SUPPORTED_LANGUAGES[0];

    let html = '<div class="noddi-widget-container">';

    // Panel
    if (state.isOpen) {
      const pos = config?.position === 'bottom-right' ? 'right:20px' : 'left:20px';
      
      // Show loading state while config is being fetched
      if (configLoading || !config) {
        html += '<div class="noddi-widget-panel" style="' + pos + '">';
        html += '<div class="noddi-widget-loading">';
        html += '<div class="noddi-widget-loading-spinner" style="color:#7c3aed"></div>';
        html += '</div></div>';
      } else {
        const greeting = getLocalizedText(config.greetingText, t.defaultGreeting, state.lang, config.greetingTranslations);
        const responseTime = getLocalizedText(config.responseTimeText, t.defaultResponseTime, state.lang, config.responseTimeTranslations);

      html += '<div class="noddi-widget-panel" style="' + pos + '">';
      html += '<div class="noddi-widget-header" style="background-color:' + config.primaryColor + '">';
      html += '<div class="noddi-widget-header-content">';
      if (config.logoUrl) {
        html += '<img src="' + config.logoUrl + '" alt="" class="noddi-widget-logo">';
      } else {
        html += '<div class="noddi-widget-header-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg></div>';
      }
      html += '<span class="noddi-widget-title">' + (config.companyName || 'Support') + '</span>';
      html += '</div>';
      html += '<button class="noddi-widget-close" data-action="close"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>';
      html += '</div>';

      html += '<div class="noddi-widget-content">';

      if (state.showSuccess) {
        html += '<div class="noddi-widget-success">';
        html += '<div style="color:' + config.primaryColor + '">' + icons.check + '</div>';
        html += '<h4>' + t.messageSent + '</h4><p>' + t.wellGetBack + '</p></div>';
      } else if (state.view === 'home') {
        html += '<div class="noddi-widget-home">';
        html += '<div class="noddi-widget-greeting-container">';
        html += '<h3 class="noddi-widget-greeting">' + greeting + '</h3>';
        html += '<p class="noddi-widget-response-time">' + responseTime + '</p>';
        html += '</div>';
        html += '<div class="noddi-widget-actions">';

        // Helper to create hex color with alpha for icon backgrounds
        function hexToRgba(hex, alpha) {
          const r = parseInt(hex.slice(1, 3), 16);
          const g = parseInt(hex.slice(3, 5), 16);
          const b = parseInt(hex.slice(5, 7), 16);
          return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
        }

        if (config.enableChat && config.agentsOnline) {
          html += '<button class="noddi-widget-action noddi-widget-action-primary" data-action="start-chat" style="border-color:' + config.primaryColor + '">';
          html += '<div class="noddi-widget-action-icon" style="background-color:' + hexToRgba(config.primaryColor, 0.1) + '">';
          html += '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="' + config.primaryColor + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
          html += '</div>';
          html += '<div class="noddi-widget-action-text"><span class="noddi-widget-action-title">' + t.startLiveChat + '</span><span class="noddi-widget-action-subtitle">' + t.online + '</span></div>';
          html += '<span class="noddi-widget-online-badge">●</span></button>';
        }

        if (config.enableChat && !config.agentsOnline) {
          html += '<div class="noddi-widget-offline-notice">';
          html += '<div class="noddi-widget-offline-icon">' + icons.clock + '</div>';
          html += '<div class="noddi-widget-offline-text">';
          html += '<span class="noddi-widget-offline-title">' + t.offline + '</span>';
          html += '<span class="noddi-widget-offline-subtitle">' + t.leaveMessage + '</span></div></div>';
        }

        if (config.enableContactForm) {
          html += '<button class="noddi-widget-action" data-action="contact">';
          html += '<div class="noddi-widget-action-icon" style="background-color:' + hexToRgba(config.primaryColor, 0.1) + '">';
          html += '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="' + config.primaryColor + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>';
          html += '</div>';
          html += '<div class="noddi-widget-action-text"><span class="noddi-widget-action-title">' + t.sendMessage + '</span><span class="noddi-widget-action-subtitle">' + t.leaveMessage + '</span></div></button>';
        }

        if (config.enableKnowledgeSearch) {
          html += '<button class="noddi-widget-action" data-action="search">';
          html += '<div class="noddi-widget-action-icon" style="background-color:' + hexToRgba(config.primaryColor, 0.1) + '">';
          html += '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="' + config.primaryColor + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>';
          html += '</div>';
          html += '<div class="noddi-widget-action-text"><span class="noddi-widget-action-title">' + t.searchAnswers + '</span><span class="noddi-widget-action-subtitle">' + t.searchKnowledgeBase + '</span></div></button>';
        }

        html += '</div></div>';

      } else if (state.view === 'prechat') {
        // Pre-chat form to collect email before starting chat
        html += '<div class="noddi-widget-view">';
        html += '<button class="noddi-widget-back" data-action="back">' + icons.back + t.back + '</button>';
        html += '<h4 style="font-size:16px;font-weight:600;color:#1f2937;margin-bottom:16px">' + t.enterEmailToContinue + '</h4>';
        html += '<form class="noddi-widget-form" data-form="prechat">';
        html += '<div class="noddi-widget-field"><label>' + t.email + ' *</label><input type="email" name="email" placeholder="your@email.com" value="' + (state.prechatEmail || '') + '" maxlength="255" required></div>';
        html += '<div class="noddi-widget-field"><label>' + t.name + ' <span style="color:#9ca3af;font-weight:normal">(' + t.optional + ')</span></label><input type="text" name="name" placeholder="' + t.yourName + '" value="' + (state.prechatName || '') + '" maxlength="100"></div>';
        if (state.error) html += '<div class="noddi-widget-error">' + state.error + '</div>';
        html += '<button type="submit" class="noddi-widget-submit" style="background-color:' + config.primaryColor + '"' + (state.isLoading ? ' disabled' : '') + '>' + (state.isLoading ? t.startingChat : t.startChat) + '</button>';
        html += '</form></div>';

      } else if (state.view === 'contact') {
        html += '<div class="noddi-widget-view">';
        html += '<button class="noddi-widget-back" data-action="back">' + icons.back + t.back + '</button>';
        html += '<form class="noddi-widget-form" data-form="contact">';
        html += '<div class="noddi-widget-field"><label>' + t.name + '</label><input type="text" name="name" placeholder="' + t.yourName + '" maxlength="100"></div>';
        html += '<div class="noddi-widget-field"><label>' + t.email + '</label><input type="email" name="email" placeholder="your@email.com" maxlength="255"></div>';
        html += '<div class="noddi-widget-field"><label>' + t.message + '</label><textarea name="message" placeholder="' + t.howCanWeHelp + '" rows="4" maxlength="2000"></textarea></div>';
        if (state.error) html += '<div class="noddi-widget-error">' + state.error + '</div>';
        html += '<button type="submit" class="noddi-widget-submit" style="background-color:' + config.primaryColor + '"' + (state.isLoading ? ' disabled' : '') + '>' + (state.isLoading ? t.sending : t.sendMessageBtn) + '</button>';
        html += '</form></div>';

      } else if (state.view === 'search') {
        html += '<div class="noddi-widget-view">';
        html += '<button class="noddi-widget-back" data-action="back">' + icons.back + t.back + '</button>';
        html += '<div class="noddi-widget-search">';
        html += '<form class="noddi-widget-search-form" data-form="search">';
        html += '<input type="text" class="noddi-widget-search-input" name="query" placeholder="' + t.searchPlaceholder + '"' + (state.isLoading ? ' disabled' : '') + '>';
        html += '<button type="submit" class="noddi-widget-search-btn" style="background-color:' + config.primaryColor + '"' + (state.isLoading ? ' disabled' : '') + '>' + (state.isLoading ? icons.spinner : icons.search) + '</button>';
        html += '</form>';
        html += '<div class="noddi-widget-results">';

        if (!state.hasSearched) {
          html += '<div class="noddi-widget-results-placeholder">' + icons.search.replace('stroke="currentColor"', 'stroke="currentColor" opacity="0.3"').replace('20', '48') + '<p>' + t.searchKnowledgeBase + '</p></div>';
        } else if (state.searchResults.length === 0) {
          html += '<div class="noddi-widget-results-empty"><p>' + t.noResults + '</p><span>' + t.tryDifferentKeywords + '</span></div>';
        } else {
          state.searchResults.forEach((r, i) => {
            const expanded = state.expandedResult === i;
            html += '<div class="noddi-widget-result' + (expanded ? ' expanded' : '') + '" data-result="' + i + '">';
            html += '<div class="noddi-widget-result-header"><span class="noddi-widget-result-question">' + r.question + '</span>' + icons.chevron.replace('noddi-widget-result-chevron', 'noddi-widget-result-chevron') + '</div>';
            if (expanded) html += '<div class="noddi-widget-result-answer">' + r.answer + '</div>';
            html += '</div>';
          });
        }

        html += '</div></div></div>';

      } else if (state.view === 'chat') {
        const session = state.chatSession;
        const isDismissed = session && session.status === 'abandoned';
        const isEnded = session && (session.status === 'ended' || session.status === 'abandoned');

        html += '<div class="noddi-widget-chat">';
        html += '<button class="noddi-widget-back" data-action="back">' + icons.back + t.back + '</button>';

        html += '<div class="noddi-chat-status">';
        html += '<div class="noddi-chat-status-indicator">';
        const dotColor = isEnded ? '#ef4444' : (session && session.status === 'active' ? '#22c55e' : '#f59e0b');
        html += '<span class="noddi-chat-status-dot" style="background-color:' + dotColor + '"></span>';
        // Show a specific message for dismissed chats
        const statusText = isDismissed ? t.chatDismissed : (isEnded ? t.chatEnded : (session && session.status === 'waiting' ? t.waitingForAgent : (t.chattingWith + ' ' + (session?.assignedAgentName || ''))));
        html += '<span class="noddi-chat-status-text">' + statusText + '</span>';
        html += '</div>';
        // Show "Cancel" button when waiting (leaves queue), "End Chat" only when active
        if (!isEnded && session) {
          if (session.status === 'waiting') {
            html += '<button class="noddi-chat-cancel-button" data-action="cancel-chat">' + (t.cancelChat || 'Cancel') + '</button>';
          } else if (session.status === 'active') {
            html += '<button class="noddi-chat-end-button" data-action="end-chat">' + t.endChat + '</button>';
          }
        }
        html += '</div>';

        html += '<div class="noddi-chat-messages">';
        if (state.chatMessages.length === 0 && !isEnded) {
          // Show queue status message when waiting
          if (session && session.status === 'waiting') {
            html += '<div class="noddi-chat-empty">';
            html += '<p style="font-size:15px;font-weight:500;color:#374151;margin:0">' + (t.youAreInQueue || "You're in the queue") + '</p>';
            html += '<p style="font-size:13px;color:#6b7280;margin:0">' + (t.agentWillBeWithYou || "An agent will be with you shortly") + '</p>';
            html += '</div>';
          } else {
            html += '<div class="noddi-chat-empty"><p>' + t.startConversation + '</p></div>';
          }
        }
        state.chatMessages.forEach(m => {
          const isCustomer = m.senderType === 'customer';
          html += '<div class="noddi-chat-message noddi-chat-message-' + (isCustomer ? 'customer' : 'agent') + '">';
          if (!isCustomer && m.senderName) html += '<span class="noddi-chat-message-sender">' + m.senderName + '</span>';
          html += '<div class="noddi-chat-message-bubble"' + (isCustomer ? ' style="background-color:' + config.primaryColor + '"' : '') + '>' + m.content + '</div>';
          html += '<span class="noddi-chat-message-time">' + new Date(m.createdAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) + '</span>';
          html += '</div>';
        });
        if (state.agentTyping) {
          html += '<div class="noddi-chat-message noddi-chat-message-agent"><div class="noddi-chat-typing"><span></span><span></span><span></span></div></div>';
        }
        html += '</div>';

        if (!isEnded) {
          html += '<div class="noddi-chat-input-container">';
          html += '<input type="text" class="noddi-chat-input" placeholder="' + t.typeMessage + '" data-chat-input>';
          html += '<button class="noddi-chat-send" style="background-color:' + config.primaryColor + '" data-action="send-chat">' + icons.send + '</button>';
          html += '</div>';
        } else if (state.showTranscriptPrompt) {
          // Transcript prompt after chat ends
          html += '<div class="noddi-chat-ended">';
          html += '<p>' + (t.wouldYouLikeTranscript || 'Would you like a copy of this conversation?') + '</p>';
          if (state.transcriptSending) {
            html += '<p style="color:#6b7280;font-size:13px">' + (t.sending || 'Sending...') + '</p>';
          } else if (state.transcriptSent) {
            html += '<p style="color:#22c55e;font-size:13px">' + (t.transcriptSent || 'Transcript sent!') + '</p>';
            html += '<button class="noddi-chat-new-button" style="background-color:' + config.primaryColor + '" data-action="back">' + t.startNewConversation + '</button>';
          } else {
            html += '<button class="noddi-chat-new-button" style="background-color:' + config.primaryColor + '" data-action="send-transcript">' + (t.sendTranscript || 'Send transcript to my email') + '</button>';
            html += '<button class="noddi-chat-skip-button" data-action="skip-transcript">' + (t.noThanks || 'No thanks') + '</button>';
          }
          html += '</div>';
        } else {
          html += '<div class="noddi-chat-ended"><p>' + t.thankYou + '</p>';
          html += '<button class="noddi-chat-new-button" style="background-color:' + config.primaryColor + '" data-action="back">' + t.startNewConversation + '</button></div>';
        }

        html += '</div>';
      }

      html += '</div>';

      // Footer
      html += '<div class="noddi-widget-footer"><div class="noddi-widget-footer-content">';
      html += '<span>' + t.poweredBy + '</span>';
      html += '<div class="noddi-widget-language-selector">';
      html += '<button class="noddi-widget-language-btn" data-action="toggle-lang">';
      html += '<span class="noddi-widget-flag">' + currentLang.flag + '</span><span>' + currentLang.name + '</span></button>';
      if (state.showLangMenu) {
        html += '<div class="noddi-widget-language-menu">';
        SUPPORTED_LANGUAGES.forEach(l => {
          html += '<button class="noddi-widget-language-option' + (l.code === state.lang ? ' active' : '') + '" data-lang="' + l.code + '">';
          html += '<span class="noddi-widget-flag">' + l.flag + '</span>' + l.name + '</button>';
        });
        html += '</div>';
      }
      html += '</div></div></div>';
      html += '</div>';
      } // close the else block for config loading check
    }

    // Floating button
    const btnPos = config?.position === 'bottom-right' ? 'right:20px' : 'left:20px';
    const btnColor = config?.primaryColor || '#7c3aed';
    html += '<button class="noddi-widget-button" style="' + btnPos + ';background-color:' + btnColor + '" data-action="toggle">';
    html += state.isOpen ? icons.close : icons.chat;
    html += '</button>';

    html += '</div>';

    container.innerHTML = html;
    attachEvents();
  }

  function attachEvents() {
    container.querySelectorAll('[data-action]').forEach(el => {
      el.onclick = (e) => handleAction(el.dataset.action, e);
    });

    container.querySelectorAll('[data-result]').forEach(el => {
      el.onclick = () => {
        const idx = parseInt(el.dataset.result);
        state.expandedResult = state.expandedResult === idx ? null : idx;
        render();
      };
    });

    container.querySelectorAll('[data-lang]').forEach(el => {
      el.onclick = () => {
        state.lang = el.dataset.lang;
        state.showLangMenu = false;
        setStoredLang(state.lang);
        render();
      };
    });

    const contactForm = container.querySelector('[data-form="contact"]');
    if (contactForm) {
      contactForm.onsubmit = async (e) => {
        e.preventDefault();
        const t = getT(state.lang);
        const fd = new FormData(contactForm);
        const name = (fd.get('name') || '').trim();
        const email = (fd.get('email') || '').trim();
        const message = (fd.get('message') || '').trim();

        if (!name || !email || !message) {
          state.error = t.fillAllFields;
          render();
          return;
        }
        if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
          state.error = t.invalidEmail;
          render();
          return;
        }

        state.isLoading = true;
        state.error = null;
        render();

        const result = await submitForm({
          widgetKey: config.widgetKey,
          name, email, message,
          pageUrl: window.location.href
        });

        state.isLoading = false;
        if (result.success) {
          state.showSuccess = true;
          render();
          setTimeout(() => {
            state.showSuccess = false;
            state.view = 'home';
            render();
          }, 3000);
        } else {
          state.error = result.error;
          render();
        }
      };
    }

    const searchForm = container.querySelector('[data-form="search"]');
    if (searchForm) {
      searchForm.onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(searchForm);
        const query = (fd.get('query') || '').trim();
        if (!query) return;

        state.isLoading = true;
        state.hasSearched = true;
        state.expandedResult = null;
        render();

        state.searchResults = await searchFaq(config.widgetKey, query);
        state.isLoading = false;
        render();
      };
    }

    // Pre-chat form handler
    const prechatForm = container.querySelector('[data-form="prechat"]');
    if (prechatForm) {
      prechatForm.onsubmit = async (e) => {
        e.preventDefault();
        const t = getT(state.lang);
        const fd = new FormData(prechatForm);
        const email = (fd.get('email') || '').trim();
        const name = (fd.get('name') || '').trim();

        if (!email) {
          state.error = t.emailRequired;
          render();
          return;
        }
        if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
          state.error = t.invalidEmail;
          render();
          return;
        }

        state.prechatEmail = email;
        state.prechatName = name;
        state.isLoading = true;
        state.error = null;
        render();

        const session = await startChat(config.widgetKey, getVisitorId(), email, name);
        state.isLoading = false;
        if (session) {
          state.chatSession = session;
          saveSession(session);
          const data = await getMessages(session.id);
          state.chatMessages = data.messages || [];
          state.agentTyping = data.agentTyping || false;
          if (data.assignedAgentName) state.chatSession.assignedAgentName = data.assignedAgentName;
          state.view = 'chat';
          startPolling();
        } else {
          state.error = 'Unable to start chat';
        }
        render();
      };
    }

    const chatInput = container.querySelector('[data-chat-input]');
    if (chatInput) {
      chatInput.onkeydown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleAction('send-chat');
        }
      };
    }
  }

  async function handleAction(action) {
    if (action === 'toggle' || action === 'close') {
      state.isOpen = action === 'toggle' ? !state.isOpen : false;
      if (!state.isOpen) {
        state.view = 'home';
        state.showLangMenu = false;
        stopPolling();
        stopHeartbeat();
      }
    } else if (action === 'back') {
      state.view = 'home';
      state.error = null;
      state.hasSearched = false;
      state.searchResults = [];
      state.expandedResult = null;
      state.prechatEmail = '';
      state.prechatName = '';
      stopPolling();
      stopHeartbeat();
    } else if (action === 'contact') {
      state.view = 'contact';
      state.error = null;
    } else if (action === 'search') {
      state.view = 'search';
      state.hasSearched = false;
      state.searchResults = [];
      state.expandedResult = null;
    } else if (action === 'start-chat') {
      // Redirect to prechat form to collect email first
      state.view = 'prechat';
      state.error = null;
    } else if (action === 'send-chat') {
      const input = container.querySelector('[data-chat-input]');
      const content = (input && input.value || '').trim();
      if (!content || !state.chatSession) return;
      input.value = '';
      const msg = await sendMessage(state.chatSession.id, content);
      if (msg) {
        state.chatMessages.push(msg);
      }
    } else if (action === 'end-chat') {
      if (state.chatSession) {
        await endChatSession(state.chatSession.id);
        state.chatSession.status = 'ended';
        state.showTranscriptPrompt = true;
        clearSavedSession();
        stopPolling();
      }
    } else if (action === 'cancel-chat') {
      // User wants to leave the queue (waiting state)
      if (state.chatSession) {
        await endChatSession(state.chatSession.id);
        state.chatSession = null;
        state.chatMessages = [];
        clearSavedSession();
        stopPolling();
        stopHeartbeat();
        state.view = 'home';
      }
    } else if (action === 'send-transcript') {
      if (state.chatSession && state.prechatEmail) {
        state.transcriptSending = true;
        render();
        try {
          await fetch(apiUrl + '/send-chat-transcript', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: state.chatSession.id, email: state.prechatEmail, language: state.lang })
          });
          state.transcriptSent = true;
        } catch (e) {}
        state.transcriptSending = false;
      }
    } else if (action === 'skip-transcript') {
      state.showTranscriptPrompt = false;
    } else if (action === 'toggle-lang') {
      state.showLangMenu = !state.showLangMenu;
    }
    render();
  }

  // ========== NOTIFICATIONS ==========
  function playNotificationSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {}
  }

  function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  function showBrowserNotification(title, body) {
    if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
      try {
        const notification = new Notification(title, {
          body: body.substring(0, 100),
          icon: config && config.logoUrl ? config.logoUrl : undefined
        });
        notification.onclick = () => {
          window.focus();
          notification.close();
        };
        setTimeout(() => notification.close(), 5000);
      } catch (e) {}
    }
  }

  function startPolling() {
    if (pollInterval) return;
    requestNotificationPermission();
    // Start heartbeat to keep session alive
    startHeartbeat();
    pollInterval = setInterval(async () => {
      if (!state.chatSession) return;
      const prevMsgCount = state.chatMessages.length;
      const data = await getMessages(state.chatSession.id);
      if (data.messages) {
        const existingIds = new Set(state.chatMessages.map(m => m.id));
        data.messages.forEach(m => {
          if (!existingIds.has(m.id)) state.chatMessages.push(m);
        });
      }
      // Check for new agent messages and notify
      if (state.chatMessages.length > prevMsgCount) {
        const newMessages = state.chatMessages.slice(prevMsgCount);
        // Fix: API returns senderType (camelCase), not sender_type
        const agentMessages = newMessages.filter(m => m.senderType === 'agent');
        if (agentMessages.length > 0) {
          playNotificationSound();
          const lastAgentMsg = agentMessages[agentMessages.length - 1];
          const agentName = state.chatSession.assignedAgentName || 'Support';
          showBrowserNotification(agentName, lastAgentMsg.content);
        }
      }
      const prevTyping = state.agentTyping;
      const prevStatus = state.chatSession?.status;
      state.agentTyping = data.agentTyping || false;
      if (data.status) state.chatSession.status = data.status;
      if (data.assignedAgentName) state.chatSession.assignedAgentName = data.assignedAgentName;
      // Only re-render if something changed to avoid flickering
      const messagesChanged = state.chatMessages.length !== prevMsgCount;
      const typingChanged = prevTyping !== state.agentTyping;
      const statusChanged = prevStatus !== state.chatSession?.status;
      if (messagesChanged || typingChanged || statusChanged) {
        renderChatMessages();
      }
    }, 3000);
  }

  function stopPolling() {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
    stopHeartbeat();
  }

  function startHeartbeat() {
    if (heartbeatInterval) return;
    // Send ping every 30 seconds to keep session alive
    heartbeatInterval = setInterval(() => {
      if (state.chatSession && state.chatSession.status !== 'ended' && state.chatSession.status !== 'abandoned') {
        sendPing(state.chatSession.id);
      }
    }, 30000);
    // Send initial ping
    if (state.chatSession) {
      sendPing(state.chatSession.id);
    }
  }

  function stopHeartbeat() {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
  }

  // ========== INIT ==========
  function injectStyles() {
    if (document.getElementById('noddi-widget-styles')) return;
    const style = document.createElement('style');
    style.id = 'noddi-widget-styles';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  let availabilityInterval = null;

  async function init(options) {
    console.log('[Noddi] init() called with:', options);
    if (!options || !options.widgetKey) {
      console.error('[Noddi] widgetKey is required');
      return;
    }

    apiUrl = options.apiUrl || 'https://qgfaycwsangsqzpveoup.supabase.co/functions/v1';
    console.log('[Noddi] Using API URL:', apiUrl);

    injectStyles();
    console.log('[Noddi] Styles injected');

    container = document.createElement('div');
    container.id = 'noddi-widget-root';
    document.body.appendChild(container);
    console.log('[Noddi] Container created and appended to body');

    // Render immediately with button (config not yet loaded)
    render();

    console.log('[Noddi] Fetching config for key:', options.widgetKey);
    configLoading = true;
    config = await fetchConfig(options.widgetKey);
    configLoading = false;
    
    if (!config) {
      console.error('[Noddi] Failed to load widget config');
      return;
    }
    console.log('[Noddi] Config loaded:', config);

    state.lang = getStoredLang() || config.language || 'no';
    console.log('[Noddi] Language set to:', state.lang);
    render();
    console.log('[Noddi] Widget rendered successfully!');

    // Start availability polling (every 30 seconds)
    // This ensures widget reflects agent online/offline status changes
    availabilityInterval = setInterval(async () => {
      const freshConfig = await fetchConfig(options.widgetKey);
      if (freshConfig && freshConfig.agentsOnline !== config.agentsOnline) {
        console.log('[Noddi] Availability changed:', config.agentsOnline, '->', freshConfig.agentsOnline);
        config.agentsOnline = freshConfig.agentsOnline;
        // Only re-render if panel is open on home view (where availability affects UI)
        if (state.isOpen && state.view === 'home') {
          render();
        }
      }
    }, 30000);
  }

  // ========== GLOBAL API ==========
  function processQueue() {
    console.log('[Noddi] Processing queue...');
    const q = window.NoddiWidget && window.NoddiWidget.q;
    console.log('[Noddi] Queue contents:', q);
    if (q && Array.isArray(q)) {
      q.forEach(args => {
        console.log('[Noddi] Processing command:', args[0], args[1]);
        if (args[0] === 'init') init(args[1]);
      });
    }
  }

  const api = function(cmd, opts) {
    console.log('[Noddi] API called:', cmd, opts);
    if (cmd === 'init') init(opts);
  };
  api.init = init;
  api.q = (window.NoddiWidget && window.NoddiWidget.q) || [];

  console.log('[Noddi] Setting up global API, existing queue:', api.q);
  window.NoddiWidget = api;
  window.noddi = api;

  if (document.readyState === 'loading') {
    console.log('[Noddi] Document still loading, waiting for DOMContentLoaded');
    document.addEventListener('DOMContentLoaded', processQueue);
  } else {
    console.log('[Noddi] Document ready, processing queue immediately');
    processQueue();
  }
})();
`.trim();

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get('action');

  // Serve the widget JS directly
  if (req.method === 'GET' && !action) {
    return new Response(WIDGET_JS, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/javascript',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }

  // Deploy action - upload to storage
  if (req.method === 'POST' && action === 'deploy') {
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('widget')
        .upload('widget.js', WIDGET_JS, {
          contentType: 'application/javascript',
          upsert: true,
          cacheControl: '3600',
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return new Response(JSON.stringify({ error: 'Failed to upload widget' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get public URL
      const { data: publicUrl } = supabase.storage
        .from('widget')
        .getPublicUrl('widget.js');

      return new Response(JSON.stringify({
        success: true,
        url: publicUrl.publicUrl,
        size: WIDGET_JS.length,
        message: 'Widget deployed successfully!'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Deploy error:', error);
      return new Response(JSON.stringify({ error: 'Deploy failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  return new Response(JSON.stringify({ error: 'Invalid request' }), {
    status: 400,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
