// Local text drafts are an explicit fallback, never a claim of cloud success.
const PREFIX = 'artifact-text-draft-v1:';
const LAST = 'artifact-text-draft-last-v1';
export const isDraft = p => p?.ownerUid === 'local-draft' && String(p?.projectId).startsWith('draft:');
function storage() { return window.localStorage; }
export function errorText(error) {
  const text = String(error?.message || error || '');
  if (/failed to fetch|fetch failed|network|load failed|timeout|timed out|无法.*项目资料库/i.test(text))
    return '暂时无法连接云端资料库，材料选择没有问题。可以重试，或保存文字方案到本机继续编辑（尚未同步云端）。';
  return text || '暂时无法保存，请保留当前页面后重试。';
}
function parse(text) {
  try { const r = JSON.parse(text); return r?.version === 1 && isDraft(r.snapshot) ? r : null; }
  catch { return null; }
}
function textSnapshot(project, id) {
  return JSON.parse(JSON.stringify({...project,projectId:id,ownerUid:'local-draft',assets:[],hasUploads:false},(key,value)=>key==='objectUrl'?undefined:value));
}
export function saveDraft(project) {
  const id = isDraft(project) ? project.projectId : project?.projectId && project?.ownerUid
    ? 'draft:backup:' + encodeURIComponent(project.ownerUid + ':' + project.projectId)
    : 'draft:' + crypto.randomUUID();
  const snapshot = textSnapshot(project,id);
  const record = {version:1,snapshot,updatedAt:new Date().toISOString()};
  try { storage().setItem(PREFIX+id,JSON.stringify(record)); storage().setItem(LAST,id); }
  catch { throw new Error('本机存储不可用或空间不足，未保存成功。请保留当前页面并释放空间后重试。'); }
  return snapshot;
}
export function readDraft(connection) {
  let record;
  try { record = parse(storage().getItem(PREFIX+connection.projectId)); } catch {}
  if (!record || record.snapshot.ownerUid !== connection.ownerUid) throw new Error('本机草稿不存在，请在原浏览器中打开。');
  return {...connection,title:record.snapshot.title,type:record.snapshot.type,site:record.snapshot.site,siteType:record.snapshot.siteType,updatedAt:record.updatedAt,snapshot:record.snapshot};
}
export function lastDraft(fallback) {
  try { return readDraft({projectId:storage().getItem(LAST),ownerUid:'local-draft'}).snapshot; } catch { return fallback; }
}
export function selectCurrent(connection) {
  try { if(isDraft(connection)) storage().setItem(LAST,connection.projectId); else storage().removeItem(LAST); } catch {}
}
export function listDrafts() {
  try {
    const items=[];
    for(let i=0;i<storage().length;i++) {
      const key=storage().key(i);
      if(!key?.startsWith(PREFIX)) continue;
      const r=parse(storage().getItem(key));
      if(r) items.push({...readDraft(r.snapshot),type:'本机草稿 · 未同步云端'});
    }
    return items.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
  } catch { return []; }
}
export function tryBackup(project) {
  try { saveDraft(project); return '文字修改已备份到本机，尚未同步云端。附件未包含在草稿中。'; }
  catch { return '本机备份也未成功，请勿关闭页面。'; }
}
