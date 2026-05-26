declare const process: {
    env: Record<string, string | undefined>;
    argv: string[];
    exit: (code?: number) => never;
};

type Intent = 'REVIEW_ALL' | 'RUN_TESTS' | 'REVIEW_CONVENTIONS' | 'NONE';

const AGENT_MENTION_REGEX = /@(slingr-review-agent|AgentRevisar|copilot)\b/gi;

function normalizeComment(commentBody: string) {
    return commentBody
        .replace(AGENT_MENTION_REGEX, "")
        .replace(/\s+/g, " ")
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

export function detectIntent(commentBody: string): Intent {
    const cleanComment = normalizeComment(commentBody);

    if (!cleanComment) {
        return 'NONE';
    }

    if (/(convenciones|conventions|linter?s?|linting|formato|formatos|estilo|estilos|style|styles|prettier|eslint)/.test(cleanComment)) {
        return 'REVIEW_CONVENTIONS';
    }

    if (/(test|tests|testing|suite de pruebas|suite de test|prueba|pruebas|arregla los test|arregla el test|corre los test|corre las pruebas|ejecuta los test|ejecuta las pruebas)/.test(cleanComment)) {
        return 'RUN_TESTS';
    }

    if (/(revisa todo|review all|revision completa|full review|todo porfa|listo para mergear|mergear)/.test(cleanComment)) {
        return 'REVIEW_ALL';
    }

    return 'NONE';
}

async function main() {
    const commentBody = process.env.COMMENT_BODY;

    if (!commentBody) {
        console.error("❌ No se recibió el comentario en la variable COMMENT_BODY");
        process.exit(1);
    }

    const cleanComment = normalizeComment(commentBody);
    console.log(`🤖 [Agente] Analizando comentario: "${cleanComment}"`);

    const intent = detectIntent(commentBody);

    console.log(`🎯 [Copilot] Intención detectada: ${intent}`);

    switch (intent) {
        case 'REVIEW_ALL':
            console.log("🚀 [Ejecución] Iniciando la revisión completa (Linters + Tests + Docs)...");
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
}

if (process.argv.some((arg) => /(^|[\\/])src[\\/]agent[\\/]index\.ts$/.test(arg))) {
    void main();
}
