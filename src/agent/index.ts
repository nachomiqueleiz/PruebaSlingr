import { OpenAI } from "openai";

declare const process: {
    env: Record<string, string | undefined>;
    exit: (code?: number) => never;
};

// 1. Configuramos el cliente para apuntar a la API oficial de GitHub Copilot
const SYSTEM_PROMPT = `Eres el motor de IA de slingr-review-agent. Tu único trabajo es analizar el comentario de un desarrollador en un PR y clasificar su intención.
Las intenciones válidas son:
- REVIEW_ALL: Si pide revisar todo, verificar la PR para mergear, o frases similares en inglés o español (ej: "revisa todo", "review all", "listo para mergear").
- RUN_TESTS: Si pide ejecutar la suite de pruebas o tests.
- REVIEW_CONVENTIONS: Si pide validar linters, formatos o estilos de código.
- NONE: Si no es una orden directa de ejecución (ej: saludos, preguntas, comentarios informativos).

Responde estrictamente en formato JSON: { "intent": "VALOR" }`;

async function main() {
    const commentBody = process.env.COMMENT_BODY;
    const githubToken = process.env.GITHUB_TOKEN;

    if (!commentBody) {
        console.error("❌ No se recibió el comentario en la variable COMMENT_BODY");
        process.exit(1);
    }

    if (!githubToken) {
        console.error("❌ No se recibió el token en la variable GITHUB_TOKEN");
        process.exit(1);
    }

    const copilot = new OpenAI({
        apiKey: githubToken,
        baseURL: "https://api.githubcopilot.com"
    });

    // Limpiamos la mención del bot para analizar solo el comando del usuario
    const cleanComment = commentBody.replace(/@slingr-review-agent/g, '').trim();
    console.log(`🤖 [Agente] Analizando comentario: "${cleanComment}"`);

    try {
        // 2. Le preguntamos a Copilot qué quiere hacer el desarrollador
        const response = await copilot.chat.completions.create({
            model: "gpt-4o", 
            response_format: { type: "json_object" },
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: `Analiza este comentario: "${cleanComment}"` }
            ]
        });

        const data = JSON.parse(response.choices[0].message.content || "{}");
        const intent = data.intent;
        
        console.log(`🎯 [Copilot] Intención detectada: ${intent}`);

        // 3. El enrutador inteligente actúa según lo que decidió la IA
        switch (intent) {
            case 'REVIEW_ALL':
                console.log("🚀 [Ejecución] Iniciando la revisión completa (Linters + Tests + Docs)...");
                // Aquí irán tus funciones reales más adelante
                break;
                
            case 'RUN_TESTS':
                console.log("🧪 [Ejecución] Corriendo la suite de pruebas pre-merge...");
                break;

            case 'REVIEW_CONVENTIONS':
                console.log("🎨 [Ejecución] Revisando convenciones de código y formato...");
                break;

            case 'NONE':
                console.log("💤 [Info] El comentario no requiere ninguna acción del agente.");
                break;

            default:
                console.log("⚠️ [Advertencia] Intención no reconocida por el sistema.");
                break;
        }

    } catch (error) {
        console.error("❌ Error en el cerebro de Copilot:", error);
        process.exit(1);
    }
}

main();