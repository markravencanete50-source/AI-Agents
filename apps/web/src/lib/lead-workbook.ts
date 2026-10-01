import ExcelJS from 'exceljs';
import { leadBatchSchema,type LeadBatch } from '@office/contracts';

export async function leadWorkbook(input:LeadBatch){
 const batch=leadBatchSchema.parse(input),book=new ExcelJS.Workbook();book.creator='Orbit Office';book.created=new Date(batch.generated_at);
 const leads=book.addWorksheet('Leads',{views:[{state:'frozen',ySplit:4}]});
 leads.columns=[{key:'title',width:40},{key:'company',width:25},{key:'market',width:22},{key:'service',width:30},{key:'posted_at',width:26},{key:'budget',width:25},{key:'location',width:25},{key:'company_size',width:25},{key:'icp_status',width:42},{key:'evidence',width:75},{key:'url',width:55},{key:'checked_at',width:26},{key:'notes',width:60}];
 leads.addRow(['Orbit · Marketplace lead list']);leads.mergeCells('A1:M1');leads.getCell('A1').font={size:18,bold:true,color:{argb:'FF344D48'}};leads.getRow(1).height=32;
 leads.addRow([batch.brief]);leads.mergeCells('A2:M2');leads.getRow(2).height=55;
 leads.addRow([`${batch.rows.length} opportunities · generated ${batch.generated_at} · unknown size is not a confirmed startup match`]);leads.mergeCells('A3:M3');
 leads.addRow(['Role / hiring need','Company','Marketplace','Service match','Posted / updated (UTC)','Budget / salary','Location','Company size (evidence)','ICP qualification','Hiring evidence','Posting link','Checked (UTC)','Notes']);
 for(const lead of batch.rows){const row=leads.addRow(lead);row.height=115;row.getCell('url').value={text:lead.url,hyperlink:lead.url};row.getCell('url').font={color:{argb:'FF497B5E'},underline:true};}
 leads.autoFilter={from:{row:4,column:1},to:{row:Math.max(4,leads.rowCount),column:13}};
 const log=book.addWorksheet('Search log',{views:[{state:'frozen',ySplit:1}]});
 log.columns=[{key:'market',width:22},{key:'query',width:35},{key:'status',width:18},{key:'count',width:20},{key:'url',width:75},{key:'note',width:90}];
 log.addRow(['Marketplace','Search query','Search status','Candidates found','Source searched','Coverage / limitations']);
 for(const search of batch.searches){const row=log.addRow(search);row.height=60;}
 for(const [sheet,header] of [[leads,4],[log,1]] as const){
  sheet.eachRow(row=>row.eachCell(cell=>{cell.alignment={vertical:'top',wrapText:true};}));
  sheet.getRow(header).height=36;sheet.getRow(header).eachCell(cell=>{cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF497B5E'}};cell.font={bold:true,color:{argb:'FFFFFFFF'}};});
 }
 // Untrusted listing text is stored as strings, never as Excel formula objects.
 return new Uint8Array(await book.xlsx.writeBuffer());
}
