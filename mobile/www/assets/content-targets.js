// Public pages retain their original element tree. Only the admin preview gets
// editable wrappers around bare text; custom tags avoid existing span styles.
export function textRuns(doc){const walker=doc.createTreeWalker(doc.body,128),runs=[];let mark;while((mark=walker.nextNode())){const match=/^elan-copy:([a-f0-9]{32})$/.exec(mark.data);if(match&&mark.nextSibling?.nodeType===3)runs.push({key:match[1],node:mark.nextSibling});}return runs;}
export function mountEditableRuns(doc){for(const {key,node} of textRuns(doc)){const wrapper=doc.createElement('elan-copy');wrapper.dataset.contentKey=key;wrapper.style.display='inline';node.replaceWith(wrapper);wrapper.append(node);}}
