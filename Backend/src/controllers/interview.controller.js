const pdfParse = require('pdf-parse');
const { generateInterviewReport, generateResumePdf } = require('../services/ai.service');
const InterviewReportModel = require('../model/interviewReport.model');

async function generateInterviewReportController(req, res) {

    if (!req.file || !req.file.buffer) {
        return res.status(400).json({ message: 'Resume file is required and must be uploaded as file field "resume"' });
    }

    const resumeContent = await (new pdfParse.PDFParse(Uint8Array.from(req.file.buffer))).getText();
    const { selfDescription, jobDescription } = req.body;

    try {
        const interviewReportByAi = await generateInterviewReport({
            resume: resumeContent.text,
            selfDescription,
            jobDescription
        });

        console.log('Normalized AI report object:', JSON.stringify(interviewReportByAi, null, 2));

        const userSafeReport = {
            user: req.user.id,
            resume: resumeContent.text,
            selfDescription,
            jobDescription,
            /* --- OLD BULKY VERIFICATION COMMENTED OUT ---
            title: typeof interviewReportByAi.title === 'string' ? interviewReportByAi.title : '',
            matchScore: typeof interviewReportByAi.matchScore === 'number' ? interviewReportByAi.matchScore : 0,
            technicalQuestions: Array.isArray(interviewReportByAi.technicalQuestions) ? interviewReportByAi.technicalQuestions : [],
            behavioralQuestions: Array.isArray(interviewReportByAi.behavioralQuestions) ? interviewReportByAi.behavioralQuestions : [],
            skillGaps: Array.isArray(interviewReportByAi.skillGaps) ? interviewReportByAi.skillGaps : [],
            preparationPlan: Array.isArray(interviewReportByAi.preparationPlan) ? interviewReportByAi.preparationPlan : [],
            ------------------------------------------------ */
            ...interviewReportByAi // Concise approach leveraging the structured service output
        };

        console.log('Mongoose save payload:', JSON.stringify(userSafeReport, null, 2));

        const interviewReport = await InterviewReportModel.create(userSafeReport);

        res.status(201).json({
            message: 'Interview report generated successfully',
            interviewReport
        });
    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({ message: 'Failed to generate interview report' });
    }
}

async function getInterviewReportByIdController(req, res) {
    const { interviewId } = req.params;

    try {
        const interviewReport = await InterviewReportModel.findOne({ _id: interviewId, user: req.user.id });
        if (!interviewReport) {
            return res.status(404).json({ message: 'Interview report not found' });
        }
        res.status(200).json({
            message: 'Interview report fetched successfully',
            interviewReport
        });
    } catch (error) {
        console.error('Error fetching report:', error);
        res.status(500).json({ message: 'Failed to fetch interview report' });
    }
}

async function getAllInterviewReportsController(req, res) {
    try {
        const interviewReports = await InterviewReportModel.find({ user: req.user.id }).sort({ createdAt: -1 });
        res.status(200).json({
            message: 'Interview reports fetched successfully',
            interviewReports
        });
    } catch (error) {
        console.error('Error fetching reports:', error);
        res.status(500).json({ message: 'Failed to fetch interview reports' });
    }
}

/**
 * @description Controller to generate resume PDF based on user self description, resume and job description.
 */
async function generateResumePdfController(req, res) {
    const { interviewReportId } = req.params

    const interviewReport = await InterviewReportModel.findById(interviewReportId)

    if (!interviewReport) {
        return res.status(404).json({
            message: "Interview report not found."
        })
    }

    const { resume, jobDescription, selfDescription } = interviewReport

    const pdfBuffer = await generateResumePdf({ resume, jobDescription, selfDescription })

    res.set({
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=resume_${interviewReportId}.pdf`
    })

    res.send(pdfBuffer)
}

module.exports = {
    generateInterviewReportController,
    getInterviewReportByIdController,
    getAllInterviewReportsController,
    generateResumePdfController
};