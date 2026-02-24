import fs from 'fs';

const files = [
    'src/pages/admin/AdminQuestionBankListPage.tsx',
    'src/pages/admin/AdminQuestionBankDetailPage.tsx',
    'src/pages/admin/AdminQuestionBankCreatePage.tsx',
    'src/components/admin/questions/QuestionsManager.tsx',
    'src/components/admin/questions/QuestionEditorCard.tsx',
    'src/components/admin/ai-generator/AIQuestionGenerator.tsx'
];

files.forEach(file => {
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');

        // Backgrounds
        content = content.replace(/bg-indigo-600/g, 'bg-primary');
        content = content.replace(/bg-indigo-500/g, 'bg-primary');
        content = content.replace(/hover:bg-indigo-[67]00/g, 'hover:bg-primary/90');

        // Light backgrounds
        content = content.replace(/bg-indigo-50\/30/g, 'bg-primary/5');
        content = content.replace(/bg-indigo-[51]0/g, 'bg-primary/10');
        content = content.replace(/bg-indigo-100/g, 'bg-primary/10');

        // Text
        content = content.replace(/text-indigo-[56]00/g, 'text-primary');
        content = content.replace(/hover:text-indigo-[56]00/g, 'hover:text-primary');

        // Borders
        content = content.replace(/border-indigo-100\/30/g, 'border-primary/10');
        content = content.replace(/border-indigo-[12]00/g, 'border-primary/20');
        content = content.replace(/border-indigo-500/g, 'border-primary');

        // Rings
        content = content.replace(/ring-indigo-500/g, 'ring-primary');
        content = content.replace(/focus:ring-indigo-500/g, 'focus:ring-primary');

        fs.writeFileSync(file, content);
        console.log(`Updated ${file}`);
    } else {
        console.log(`File not found: ${file}`);
    }
});
