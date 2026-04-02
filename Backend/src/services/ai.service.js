const { GoogleGenAI } = require("@google/genai");
const { z } = require("zod");
const { zodToJsonSchema } = require("zod-to-json-schema");
const puppeteer = require("puppeteer");

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_API_KEY
});

const interviewReportSchema = z.object({
    matchScore: z.number().describe("A score between 0 and 100 indicating how well the candidate's profile matches the job describe"),
    technicalQuestions: z.array(z.object({
        question: z.string().describe("The technical question can be asked in the interview"),
        intention: z.string().describe("The intention of interviewer behind asking this question"),
        answer: z.string().describe("How to answer this question, what points to cover, what approach to take etc.")
    })).describe("Technical questions that can be asked in the interview along with their intention and how to answer them"),
    behavioralQuestions: z.array(z.object({
        question: z.string().describe("The technical question can be asked in the interview"),
        intention: z.string().describe("The intention of interviewer behind asking this question"),
        answer: z.string().describe("How to answer this question, what points to cover, what approach to take etc.")
    })).describe("Behavioral questions that can be asked in the interview along with their intention and how to answer them"),
    skillGaps: z.array(z.object({
        skill: z.string().describe("The skill which the candidate is lacking"),
        severity: z.enum([ "low", "medium", "high" ]).describe("The severity of this skill gap, i.e. how important is this skill for the job and how much it can impact the candidate's chances")
    })).describe("List of skill gaps in the candidate's profile along with their severity"),
    preparationPlan: z.array(z.object({
        day: z.number().describe("The day number in the preparation plan, starting from 1"),
        focus: z.string().describe("The main focus of this day in the preparation plan, e.g. data structures, system design, mock interviews etc."),
        tasks: z.array(z.string()).describe("List of tasks to be done on this day to follow the preparation plan, e.g. read a specific book or article, solve a set of problems, watch a video etc.")
    })).describe("A day-wise preparation plan for the candidate to follow in order to prepare for the interview effectively"),
    title: z.string().describe("The title of the job for which the interview report is generated"),
})

async function generateInterviewReport({ resume, selfDescription, jobDescription }) {

    const prompt = `Given the following information about a job candidate and a job description, generate a comprehensive interview report in strict JSON format with these exact fields and types (do not include any Markdown or text outside JSON object):\n\n{
  "matchScore": number (0-100),\n  "technicalQuestions": [{"question": string, "intention": string, "answer": string}],\n  "behavioralQuestions": [{"question": string, "intention": string, "answer": string}],\n  "skillGaps": [{"skill": string, "severity": "low" | "medium" | "high"}],\n  "preparationPlan": [{"day": number, "focus": string, "tasks": [string]}],\n  "title": string\n}\n\nIf any list is empty, return an empty array. If matchScore cannot be determined, return 0.\n\nResume: ${resume}\nSelf Description: ${selfDescription}\nJob Description: ${jobDescription}`

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: zodToJsonSchema(interviewReportSchema)
        }
    })

    console.log('AI raw response text:', response.text);

    /* --- OLD BULKY PARSING LOGIC TEMPORARILY COMMENTED OUT ---
    let parsed;
    try {
        parsed = JSON.parse(response.text);
    } catch (error) {
        console.error('Failed to parse AI response as JSON:', error);
        parsed = {};
    }

    const parseMaybeArray = (value) => {
        if (Array.isArray(value)) return value;
        if (typeof value === 'string') {
            // Normalize common formats: backticks or quotes, and object list without surrounding []
            let clean = value.trim();
            if (clean.startsWith('`') && clean.endsWith('`')) {
                clean = clean.slice(1, -1).trim();
            }
            if ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
                clean = clean.slice(1, -1).trim();
            }

            // Try parse as JSON array or object
            try {
                const json = JSON.parse(clean);
                if (Array.isArray(json)) return json;
                if (json && typeof json === 'object') return [json];
            } catch (_) {
                // continue to next strategies
            }

            // Handle multiple object entries inside a string (object + object ...)
            if (!clean.startsWith('[') && clean.startsWith('{') && clean.endsWith('}')) {
                const maybeObjects = clean.split(/}\s*,\s*\{/).map((s, index, arr) => {
                    if (arr.length === 1) return s;
                    if (index === 0) return s + '}';
                    if (index === arr.length - 1) return '{' + s;
                    return '{' + s + '}';
                });
                if (maybeObjects.length > 1) {
                    try {
                        const json = JSON.parse(`[${maybeObjects.join(',')}]`);
                        if (Array.isArray(json)) return json;
                    } catch (_) {
                        // nop
                    }
                }

                // Single object fallback
                try {
                    const json = JSON.parse(clean);
                    if (json && typeof json === 'object') return [json];
                } catch (_) {
                    // nop
                }
            }

            // If it looks like a list of objects without JSON array markers, try a lightweight conversion
            const tryJsonArray = clean.match(/\{[^\}]*\}/g);
            if (tryJsonArray && tryJsonArray.length > 0) {
                try {
                    const json = JSON.parse('[' + tryJsonArray.join(',') + ']');
                    if (Array.isArray(json)) return json;
                } catch (_) {
                    // no-op
                }
            }
        }
        return [];
    };

    const normalizeTechnicalOrBehavioral = (item) => {
        const q = item && typeof item === 'object' ? item.question : item;
        const i = item && typeof item === 'object' ? item.intention : undefined;
        const a = item && typeof item === 'object' ? item.answer : undefined;
        return {
            question: q ? String(q) : 'N/A',
            intention: i ? String(i) : 'N/A',
            answer: a ? String(a) : 'N/A',
        };
    };

    const normalizeSkillGap = (item) => {
        const s = item && typeof item === 'object' ? item.skill : item;
        const sev = item && item.severity ? item.severity : 'low';
        return {
            skill: s ? String(s) : 'N/A',
            severity: ['low', 'medium', 'high'].includes(sev) ? sev : 'low'
        };
    };

    const normalizePreparationPlan = (item) => {
        const d = item && typeof item === 'object' ? item.day : item;
        const f = item && typeof item === 'object' ? item.focus : undefined;
        const t = item && typeof item === 'object' ? item.tasks : undefined;
        return {
            day: typeof d === 'number' && d > 0 ? d : 1,
            focus: f ? String(f) : 'N/A',
            tasks: Array.isArray(t) ? t.map((x) => String(x)) : [],
        };
    };

    const normalizeArrayItems = (arr, type) => {
        if (!Array.isArray(arr)) return [];
        return arr.map((item) => {
            if (typeof item === 'object' && item !== null) {
                if (type === 'technicalQuestions' || type === 'behavioralQuestions') return normalizeTechnicalOrBehavioral(item);
                if (type === 'skillGaps') return normalizeSkillGap(item);
                if (type === 'preparationPlan') return normalizePreparationPlan(item);
            }

            if (typeof item === 'string') {
                try {
                    const parsed = JSON.parse(item);
                    if (parsed && typeof parsed === 'object') {
                        if (type === 'technicalQuestions' || type === 'behavioralQuestions') return normalizeTechnicalOrBehavioral(parsed);
                        if (type === 'skillGaps') return normalizeSkillGap(parsed);
                        if (type === 'preparationPlan') return normalizePreparationPlan(parsed);
                    }
                } catch (_) {
                    if (type === 'technicalQuestions' || type === 'behavioralQuestions') return normalizeTechnicalOrBehavioral(item);
                    if (type === 'skillGaps') return normalizeSkillGap(item);
                    if (type === 'preparationPlan') return normalizePreparationPlan(item);
                }
            }

            if (typeof item === 'number') {
                if (type === 'technicalQuestions' || type === 'behavioralQuestions') return normalizeTechnicalOrBehavioral(item);
                if (type === 'skillGaps') return normalizeSkillGap(item);
                if (type === 'preparationPlan') return normalizePreparationPlan(item);
            }

            return null;
        }).filter((item) => item && typeof item === 'object');
    };

    const fieldAsString = (value) => {
        if (typeof value === 'string') return value;
        if (value != null && value.toString) return value.toString();
        return '';
    };

    return {
        matchScore: typeof parsed.matchScore === 'number' ? parsed.matchScore : (typeof parsed.matchScore === 'string' && !Number.isNaN(parseFloat(parsed.matchScore)) ? parseFloat(parsed.matchScore) : 0),
        technicalQuestions: normalizeArrayItems(parseMaybeArray(parsed.technicalQuestions), 'technicalQuestions'),
        behavioralQuestions: normalizeArrayItems(parseMaybeArray(parsed.behavioralQuestions), 'behavioralQuestions'),
        skillGaps: normalizeArrayItems(parseMaybeArray(parsed.skillGaps), 'skillGaps'),
        preparationPlan: normalizeArrayItems(parseMaybeArray(parsed.preparationPlan), 'preparationPlan'),
        title: fieldAsString(parsed.title),
    };
    --- END OLD BULKY PARSING LOGIC --- */

    // --- NEW CONCISE PARSING LOGIC ---
    let rawText = response.text || "{}";
    rawText = rawText.trim();
    if (rawText.startsWith('```json')) {
        rawText = rawText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (rawText.startsWith('```')) {
        rawText = rawText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    let parsed = {};
    try {
        parsed = JSON.parse(rawText);
    } catch (e) {
        console.error('Failed to parse AI response as JSON:', e);
    }

    const coerceObject = (item, type) => {
        let obj = {};
        if (typeof item === 'object' && item !== null) {
            obj = item;
        } else if (typeof item === 'string') {
            try {
                let clean = item.trim();
                if (!clean.startsWith('{')) clean = '{' + clean;
                if (!clean.endsWith('}')) clean = clean + '}';
                obj = JSON.parse(clean);
            } catch (e) { } 
        }

        if (type === 'questions') {
            return {
                question: obj.question ? String(obj.question) : 'N/A',
                intention: obj.intention ? String(obj.intention) : 'N/A',
                answer: obj.answer ? String(obj.answer) : 'N/A'
            };
        } else if (type === 'skillGaps') {
            return {
                skill: obj.skill ? String(obj.skill) : 'N/A',
                severity: ['low', 'medium', 'high'].includes(obj.severity) ? obj.severity : 'low'
            };
        } else if (type === 'preparationPlan') {
            return {
                day: typeof obj.day === 'number' && obj.day > 0 ? obj.day : 1,
                focus: obj.focus ? String(obj.focus) : 'N/A',
                tasks: Array.isArray(obj.tasks) ? obj.tasks.map(String) : []
            };
        }
        return obj;
    };

    const ensureArray = (arr, type) => Array.isArray(arr) ? arr.map(item => coerceObject(item, type)) : [];

    return {
        matchScore: Number(parsed.matchScore) || 0,
        technicalQuestions: ensureArray(parsed.technicalQuestions, 'questions'),
        behavioralQuestions: ensureArray(parsed.behavioralQuestions, 'questions'),
        skillGaps: ensureArray(parsed.skillGaps, 'skillGaps'),
        preparationPlan: ensureArray(parsed.preparationPlan, 'preparationPlan'),
        title: parsed.title ? String(parsed.title) : "",
    };

}

async function generatePdfFromHtml(htmlContent) {
    const browser = await puppeteer.launch()
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" })

    const pdfBuffer = await page.pdf({
        format: "A4", margin: {
            top: "20mm",
            bottom: "20mm",
            left: "15mm",
            right: "15mm"
        }
    })

    await browser.close()

    return pdfBuffer
}

async function generateResumePdf({ resume, selfDescription, jobDescription }) {

    const resumePdfSchema = z.object({
        html: z.string().describe("The HTML content of the resume which can be converted to PDF using any library like puppeteer")
    })

    const prompt = `Generate resume for a candidate with the following details:
                        Resume: ${resume}
                        Self Description: ${selfDescription}
                        Job Description: ${jobDescription}

                        the response should be a JSON object with a single field "html" which contains the HTML content of the resume which can be converted to PDF using any library like puppeteer.
                        The resume should be tailored for the given job description and should highlight the candidate's strengths and relevant experience. The HTML content should be well-formatted and structured, making it easy to read and visually appealing.
                        The content of resume should be not sound like it's generated by AI and should be as close as possible to a real human-written resume.
                        you can highlight the content using some colors or different font styles but the overall design should be simple and professional.
                        The content should be ATS friendly, i.e. it should be easily parsable by ATS systems without losing important information.
                        The resume should not be so lengthy, it should ideally be 1-2 pages long when converted to PDF. Focus on quality rather than quantity and make sure to include all the relevant information that can increase the candidate's chances of getting an interview call for the given job description.
                    `

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: zodToJsonSchema(resumePdfSchema),
        }
    })


    const jsonContent = JSON.parse(response.text)

    const pdfBuffer = await generatePdfFromHtml(jsonContent.html)

    return pdfBuffer

}

module.exports = { generateInterviewReport, generateResumePdf }