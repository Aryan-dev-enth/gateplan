async function test() {
  const url = "https://www.indgovtjobs.in/2026/05/nfl-mt-recruitment.html";
  console.log("Fetching url:", url);
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
  });
  const html = await res.text();
  
  const cleanHtml = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, "");
    
  const entryMatch = /<div class=['"]entry-content['"]>([\s\S]*?)<\/div>\s*<section/i.exec(cleanHtml) || 
                     /<div class=['"]entry-content['"]>([\s\S]*?)<\/div>/i.exec(cleanHtml) ||
                     /<div class=['"]post-body entry-content['"]>([\s\S]*?)<\/div>/i.exec(cleanHtml) ||
                     /<div class=['"]post-body['"]>([\s\S]*?)<\/div>/i.exec(cleanHtml);
                     
  const articleHtml = entryMatch ? entryMatch[1] : cleanHtml;
  
  const tableRows = articleHtml.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
  console.log("Found", tableRows.length, "table rows.");
  
  for (const tr of tableRows) {
    const tds = tr.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
    if (tds.length >= 2) {
      const keyText = tds[0].replace(/<\/?[^>]+(>|$)/g, "").trim().toLowerCase();
      const valHtml = tds[1];
      const valText = valHtml.replace(/<\/?[^>]+(>|$)/g, "").replace(/&nbsp;/g, " ").trim();
      
      console.log(`Row: KEY: "${keyText}" | VAL: "${valText}" (tds length: ${tds.length})`);
      if (tds.length >= 3) {
        const valText3 = tds[2].replace(/<\/?[^>]+(>|$)/g, "").replace(/&nbsp;/g, " ").trim();
        console.log(`  -> TD3: "${valText3}"`);
      }
    }
  }
}

test();
