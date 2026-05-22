import { OpenAI } from "openai";

declare const process: {
    env: Record<string, string | undefined>;
    exit: (code?: number) => never;
};

// 1. Configuramos el cliente para apuntar a la API oficial de GitHub Copilot
const SYSTEM_PROMPT = `Eres el motor de IA de AgentRevisar. Tu único trabajo es analizar el comentario de un desarrollador en un PR y clasificar su intención.
Las intenciones válidas son:
- REVIEW_ALL: Si pide revisar todo, verificar la PR para mergear, o frases similares en inglés o español (ej: "revisa todo", "review all", "listo para mergear").
- RUN_TESTS: Si pide ejecutar la suite de pruebas o tests.
- REVIEW_CONVENTIONS: Si pide validar linters, formatos o estilos de código.
- NONE: Si no es una orden directa de ejecución (ej: saludos, preguntas, comentarios informativos).

Responde estrictamente en formato JSON: { "intent": "VALOR" }`;

async function main() {
    const commentBody = process.env.COMMENT_BODY;
    const apiKey = process.env.AI_TOKEN || process.env.GITHUB_TOKEN || process.env.COPILOT_API_KEY;
    const baseURL = process.env.AI_BASE_URL || "https://models.github.ai/inference";
    const model = process.env.AI_MODEL || "openai/gpt-4.1-mini";

    if (!commentBody) {
        console.error("❌ No se recibió el comentario en la variable COMMENT_BODY");
        process.exit(1);
    }

    if (!apiKey) {
        console.error("❌ Falta token para GitHub Models. Usa AI_TOKEN (pruebas locales/personal) o GITHUB_TOKEN (GitHub Actions/organización).");
        process.exit(1);
    }

    const copilot = new OpenAI({
        apiKey,
        baseURL
    });

    // Limpiamos la mención del bot para analizar solo el comando del usuario
    const cleanComment = commentBody.replace(/@slingr-review-agent|@AgentRevisar/gi, '').trim();
    console.log(`🤖 [Agente] Analizando comentario: "${cleanComment}"`);

    try {
        // 2. Le preguntamos a Copilot qué quiere hacer el desarrollador
        const response = await copilot.chat.completions.create({
            model,
            response_format: { type: "json_object" },
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: `Analiza este comentario: "${cleanComment}"` }
            ]
        });

        const data = JSON.parse(response.choices[0].message.content || "{}");
        const intent = data.intent;
    let summary = "Intencion no reconocida por el sistema.";
        
        console.log(`🎯 [Copilot] Intención detectada: ${intent}`);

        // 3. El enrutador inteligente actúa según lo que decidió la IA
        switch (intent) {
            case 'REVIEW_ALL':
                console.log("🚀 [Ejecución] Iniciando la revisión completa (Linters + Tests + Docs)...");
                summary = "Se detecto pedido de revision completa.";
                // Aquí irán tus funciones reales más adelante
                break;
                
            case 'RUN_TESTS':
                console.log("🧪 [Ejecución] Corriendo la suite de pruebas pre-merge...");
                summary = "Se detecto pedido de ejecucion de tests.";
                break;

            case 'REVIEW_CONVENTIONS':
                console.log("🎨 [Ejecución] Revisando convenciones de código y formato...");
                summary = "Se detecto pedido de revision de convenciones y formato.";
                break;

            case 'NONE':
                console.log("💤 [Info] El comentario no requiere ninguna acción del agente.");
                summary = "No se detecto una orden de ejecucion.";
                break;

            default:
                console.log("⚠️ [Advertencia] Intención no reconocida por el sistema.");
                break;
        }

        console.log(`AGENT_INTENT=${intent ?? "UNKNOWN"}`);
        console.log(`AGENT_SUMMARY=${summary}`);

    } catch (error) {
        console.error("❌ Error en el cerebro de Copilot:", error);
        console.log("AGENT_INTENT=ERROR");
        console.log("AGENT_SUMMARY=Error ejecutando el analisis de intencion.");
        process.exit(1);
    }
}

main();