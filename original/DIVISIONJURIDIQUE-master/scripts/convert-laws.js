const fs = require('fs');
const path = require('path');

const uploadDir = '/home/z/my-project/upload';
const outputDir = '/home/z/my-project/public/laws';

// Law configurations
const laws = [
  { inputFile: 'القانون-البحري.txt', outputFile: 'القانون_البحري.json', name: 'القانون البحري', icon: '⚓', color: '#0ea5e9' },
  { inputFile: 'القانون-التجاري.txt', outputFile: 'القانون_التجاري.json', name: 'القانون التجاري', icon: '🏢', color: '#8b5cf6' },
  { inputFile: 'القانون-المدني.txt', outputFile: 'القانون_المدني.json', name: 'القانون المدني', icon: '⚖️', color: '#2563eb' },
  { inputFile: 'قانون-الاجراءات-الجبائية.txt', outputFile: 'قانون_الاجراءات_الجبائية.json', name: 'قانون الإجراءات الجبائية', icon: '💰', color: '#16a34a' },
  { inputFile: 'قانون-الاجراءات-الجزائية-25-14-.txt', outputFile: 'قانون_الاجراءات_الجزائية.json', name: 'قانون الإجراءات الجزائية', icon: '🔒', color: '#dc2626' },
  { inputFile: 'قانون-الاجراءات-المدنية-والادارية.txt', outputFile: 'قانون_الاجراءات_المدنية_والادارية.json', name: 'قانون الإجراءات المدنية والإدارية', icon: '🏛️', color: '#ea580c' },
  { inputFile: 'قانون-الاسرة.txt', outputFile: 'قانون_الاسرة.json', name: 'قانون الأسرة', icon: '👨‍👩‍👧', color: '#ec4899' },
];

function parseLawFile(filePath, lawName) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  const articles = [];
  let currentArticle = null;
  let currentText = [];
  let bookTitle = '';
  let chapterTitle = '';
  
  // Extract header info
  let headerInfo = {
    title: lawName,
    officialName: '',
    date: ''
  };
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (!line) continue;
    
    // Skip first line (last format date)
    if (line.includes('اخر تنسيق') || line.includes('آخر تنسيق')) continue;
    
    // Get official name (usually second line)
    if (!headerInfo.officialName && (line.includes('الأمر') || line.includes('القانون') || line.includes('المرسوم'))) {
      headerInfo.officialName = line;
      continue;
    }
    
    // Check for book/chapter titles
    if (line.startsWith('الكتاب') || line.startsWith('الباب') || line.startsWith('الفصل') || line.startsWith('القسم')) {
      // Save current article if exists
      if (currentArticle && currentText.length > 0) {
        currentArticle.text = currentText.join('\n').trim();
        if (currentArticle.text) articles.push(currentArticle);
        currentText = [];
      }
      
      // Update section info
      if (line.startsWith('الكتاب')) bookTitle = line;
      else if (line.startsWith('الباب') || line.startsWith('الفصل')) chapterTitle = line;
      continue;
    }
    
    // Check for article - handle various formats
    const articleMatch = line.match(/^المادة\s*(\d+\s*(?:مكرر\s*(?:\d+|\d*\s*\d*)?)?(?:\s*\d*)?)\s*:?\s*(.*)/i);
    const articleMatch2 = line.match(/^(\d+)\s*:\s*(.*)/);
    const articleMatch3 = line.match(/^المادة\s*(\d+)\s+(مكرر\s*\d*)\s*:?\s*(.*)/i);
    
    if (articleMatch || articleMatch2 || articleMatch3) {
      // Save previous article
      if (currentArticle && currentText.length > 0) {
        currentArticle.text = currentText.join('\n').trim();
        if (currentArticle.text) articles.push(currentArticle);
      }
      
      let articleNumber, remainder;
      
      if (articleMatch) {
        articleNumber = articleMatch[1].trim();
        remainder = articleMatch[2] || '';
      } else if (articleMatch3) {
        articleNumber = `${articleMatch3[1]} ${articleMatch3[2]}`.trim();
        remainder = articleMatch3[3] || '';
      } else {
        articleNumber = articleMatch2[1];
        remainder = articleMatch2[2] || '';
      }
      
      currentArticle = {
        number: articleNumber,
        text: '',
        book: bookTitle,
        chapter: chapterTitle,
        isAmended: line.includes('معدلة') || line.includes('(معدلة)'),
        isNew: line.includes('جديدة') || line.includes('(جديدة)')
      };
      
      currentText = [remainder];
    } else if (currentArticle) {
      // Continue building current article text
      currentText.push(line);
    }
  }
  
  // Save last article
  if (currentArticle && currentText.length > 0) {
    currentArticle.text = currentText.join('\n').trim();
    if (currentArticle.text) articles.push(currentArticle);
  }
  
  return {
    ...headerInfo,
    totalArticles: articles.length,
    articles: articles
  };
}

// Process each law
laws.forEach(law => {
  const inputPath = path.join(uploadDir, law.inputFile);
  const outputPath = path.join(outputDir, law.outputFile);
  
  try {
    console.log(`Processing: ${law.name}`);
    const data = parseLawFile(inputPath, law.name);
    data.icon = law.icon;
    data.color = law.color;
    
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`  ✓ Saved: ${law.outputFile} (${data.totalArticles} articles)`);
  } catch (error) {
    console.error(`  ✗ Error processing ${law.name}:`, error.message);
  }
});

// Create index file
const index = laws.map(law => ({
  file: law.outputFile,
  name: law.name,
  icon: law.icon,
  color: law.color
}));

fs.writeFileSync(path.join(outputDir, 'index.json'), JSON.stringify(index, null, 2), 'utf-8');
console.log('\n✓ Created index.json');
console.log('Done!');
