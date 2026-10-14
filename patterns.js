export const SIZE = 24;
export const COLORS = [null,
  { name: '蜜橘橙', hex: '#f58b3b' }, { name: '奶油白', hex: '#fff0d3' },
  { name: '可可棕', hex: '#784b38' }, { name: '樱花粉', hex: '#f49b9e' },
  { name: '向日葵', hex: '#f9ce55' }, { name: '森林绿', hex: '#62966a' },
  { name: '蜜桃粉', hex: '#f8ba8f' }, { name: '鼠尾草', hex: '#9eb984' },
  { name: '薰衣草', hex: '#af9dcc' }, { name: '草莓红', hex: '#d96966' },
  { name: '晴空蓝', hex: '#8bbcc9' }, { name: '蓝莓蓝', hex: '#536f88' }
];
function art(draw) {
  const data = Array(SIZE * SIZE).fill(0);
  const dot = (x, y, c) => { if(x >= 0 && y >= 0 && x < SIZE && y < SIZE) data[y * SIZE + x] = c; };
  const rect = (x, y, w, h, c) => { for(let j=y;j<y+h;j++) for(let i=x;i<x+w;i++) dot(i,j,c); };
  const ellipse = (x,y,rx,ry,c) => { for(let j=0;j<SIZE;j++) for(let i=0;i<SIZE;i++) if(((i-x)/rx)**2+((j-y)/ry)**2 <= 1) dot(i,j,c); };
  const poly = (pts,c) => { for(let y=0;y<SIZE;y++) for(let x=0;x<SIZE;x++) { let inside=false; for(let i=0,j=pts.length-1;i<pts.length;j=i++) { const a=pts[i],b=pts[j]; if((a[1]>y+.1)!==(b[1]>y+.1) && x+.1 < (b[0]-a[0])*(y+.1-a[1])/(b[1]-a[1])+a[0]) inside=!inside; } if(inside) dot(x,y,c); } };
  draw({dot,rect,ellipse,poly}); return data;
}
export const PATTERNS = [
  {id:'cat', name:'午后小猫', subtitle:'把阳光和花朵，送给小猫', tag:'人气', category:'小动物', difficulty:'进阶', reward:120,
    data:art(({dot,rect,ellipse,poly})=>{
      ellipse(20,17,2,5,3); ellipse(20,17,1,4,1); rect(19,15,3,1,3); rect(19,18,3,1,3);
      ellipse(13,17,6,5.5,3); ellipse(13,17,5,4.5,1); ellipse(10,17,3,4.5,2);
      ellipse(8,21,3,1.5,3); rect(6,20,6,2,2); ellipse(15,21,3,1.5,3); rect(13,20,5,2,1);
      poly([[4,2],[8,4],[15,4],[19,2],[20,8],[21,11],[19,14],[6,14],[3,11],[4,8]],3);
      poly([[5,3],[8,5],[15,5],[18,3],[19,8],[20,11],[18,13],[6,13],[4,11],[5,8]],1);
      poly([[5,4],[7,6],[5,7]],4); poly([[18,4],[16,6],[18,7]],4);dot(6,7,7);dot(17,7,7);
      rect(9,5,1,2,3);rect(12,5,1,3,3);rect(15,5,1,2,3);
      ellipse(12,11,5,2.5,2);rect(7,8,2,2,3);rect(16,8,2,2,3);dot(7,8,2);dot(16,8,2);
      rect(5,10,2,1,4);rect(18,10,2,1,4);dot(12,10,3);dot(12,11,3);dot(11,12,3);dot(13,12,3);
      rect(4,8,2,1,3);rect(18,8,2,1,3);rect(17,15,2,1,3);rect(17,18,2,1,3);
      poly([[2,20],[2,17],[4,15],[5,17],[7,17],[7,21],[5,22]],6);rect(3,19,4,2,8);
      rect(4,16,1,5,6);ellipse(4,16,2.7,2.7,2);ellipse(4,16,1,1,5);dot(4,14,2);dot(4,18,2);
      rect(7,15,2,3,2);rect(8,15,2,2,2);
    })},
  {id:'rabbit',name:'花园小兔',subtitle:'一只藏在花园里的软绵绵',tag:'治愈',category:'小动物',difficulty:'轻松',reward:100,
    data:art(({dot,rect,ellipse,poly})=>{
      ellipse(8,6,2.4,5,3);ellipse(15,6,2.4,5,3);ellipse(8,6,1.5,4,2);ellipse(15,6,1.5,4,2);rect(8,3,1,5,4);rect(15,3,1,5,4);
      ellipse(12,17,5,5,3);ellipse(12,17,4,4,2);ellipse(12,11,7.5,5,3);ellipse(12,11,6.5,4,2);
      rect(8,10,1,2,3);rect(16,10,1,2,3);rect(6,12,2,1,4);rect(17,12,2,1,4);dot(12,12,4);dot(12,13,3);
      ellipse(7,21,3,1.4,3);ellipse(7,21,2,0.8,2);ellipse(16,21,3,1.4,3);ellipse(16,21,2,0.8,2);
      poly([[11,16],[13,15],[16,16],[12,20]],1);rect(11,15,3,1,6);dot(12,14,6);dot(14,14,8);
    })},
  {id:'strawberry',name:'草莓心事',subtitle:'今天也要甜一点点',tag:'新手',category:'小食物',difficulty:'简单',reward:80,
    data:art(({dot,rect,ellipse,poly})=>{
      poly([[5,7],[8,5],[16,5],[19,7],[21,11],[20,15],[17,19],[12,22],[7,19],[4,15],[3,11]],3);
      poly([[5,8],[8,6],[16,6],[19,8],[20,11],[19,15],[16,18],[12,21],[8,18],[5,15],[4,11]],10);
      poly([[8,7],[10,7],[7,14],[6,12]],4);poly([[11,8],[6,5],[10,5],[12,2],[14,5],[19,5],[15,8],[13,7]],6);dot(12,4,8);dot(13,5,8);
      [[8,10],[13,10],[17,11],[10,13],[15,14],[7,15],[11,17],[15,17],[12,19]].forEach(([x,y])=>dot(x,y,2));
    })},
  {id:'daisy',name:'一朵小雏菊',subtitle:'给平凡的一天，一朵小花',tag:'春日',category:'小植物',difficulty:'简单',reward:80,
    data:art(({dot,rect,ellipse,poly})=>{
      rect(11,9,2,13,6);poly([[11,19],[6,19],[3,15],[7,15],[11,17]],6);poly([[13,17],[17,13],[21,13],[18,17]],8);
      [[8,5],[15,5],[5,10],[18,10],[8,14],[15,14]].forEach(([x,y])=>{ellipse(x,y,3,3.3,7);ellipse(x,y,2.3,2.5,2);});
      ellipse(11.5,9.5,3.7,3.7,1);ellipse(11.5,9.5,2.8,2.8,5);dot(11,8,2);dot(10,9,2);
    })},
  {id:'frog',name:'荷叶小蛙',subtitle:'听，池塘里的夏日小曲',tag:'可爱',category:'小动物',difficulty:'轻松',reward:100,
    data:art(({dot,rect,ellipse,poly})=>{
      ellipse(12,21,10,1.4,8);ellipse(12,16,7,5,6);ellipse(12,16,5,3.5,8);
      ellipse(7,6,4,3.4,6);ellipse(17,6,4,3.4,6);ellipse(12,10,9,5,6);ellipse(12,10,8,4,8);
      ellipse(7,6,2.2,2.2,2);ellipse(17,6,2.2,2.2,2);rect(7,5,1,2,3);rect(17,5,1,2,3);
      rect(4,10,2,1,4);rect(18,10,2,1,4);rect(9,11,1,1,3);rect(10,12,5,1,3);dot(15,11,3);
      ellipse(5,19,3,2,6);ellipse(19,19,3,2,6);rect(9,15,1,4,6);rect(15,15,1,4,6);
    })},
  {id:'cloud',name:'晴天小云',subtitle:'收集一小片晴朗的天空',tag:'新手',category:'小风景',difficulty:'简单',reward:80,
    data:art(({dot,rect,ellipse,poly})=>{
      ellipse(17,6,4.4,4.4,1);ellipse(17,6,3.3,3.3,5);
      ellipse(6,13,4,4,12);ellipse(11,10,5,5,12);ellipse(16,13,4,4,12);ellipse(19,15,3,3,12);rect(5,13,15,6,12);
      ellipse(6,13,3,3,2);ellipse(11,10,4,4,2);ellipse(16,13,3,3,2);ellipse(19,15,2,2,2);rect(5,13,15,5,2);
      rect(8,13,1,2,12);rect(15,13,1,2,12);rect(7,15,2,1,4);rect(15,15,2,1,4);dot(11,15,12);dot(12,16,12);dot(13,15,12);
      dot(5,21,11);dot(10,21,11);dot(15,21,11);
    })},
  {id:'heart',name:'莓莓爱心',subtitle:'用一颗小小的心，说喜欢',tag:'迷你',category:'小心意',difficulty:'简单',reward:60,
    data:art(({dot,rect,ellipse,poly})=>{
      poly([[4,7],[7,4],[10,4],[12,6],[14,4],[17,4],[20,7],[20,12],[12,21],[4,12]],10);
      poly([[5,8],[8,5],[10,5],[12,8],[14,5],[17,5],[19,8],[19,12],[12,19],[5,12]],4);
      rect(7,7,2,3,2);dot(9,6,2);
    })},
  {id:'butterfly',name:'蝴蝶来信',subtitle:'让一抹紫色，在指尖停留',tag:'梦幻',category:'小动物',difficulty:'轻松',reward:100,
    data:art(({dot,rect,ellipse,poly})=>{
      poly([[10,10],[4,3],[2,6],[2,12],[6,14],[3,17],[4,21],[8,21],[11,17]],12);
      poly([[13,10],[19,3],[21,6],[21,12],[17,14],[20,17],[19,21],[15,21],[12,17]],12);
      poly([[10,11],[4,5],[3,7],[3,11],[7,13]],9);poly([[13,11],[19,5],[20,7],[20,11],[16,13]],9);
      poly([[10,15],[6,15],[4,17],[5,20],[8,20]],4);poly([[13,15],[17,15],[19,17],[18,20],[15,20]],4);
      ellipse(5,9,1.5,2,2);ellipse(18,9,1.5,2,2);dot(6,18,2);dot(17,18,2);
      rect(11,8,2,11,3);dot(10,6,3);dot(9,5,3);dot(13,6,3);dot(14,5,3);
    })},
  {id:'free',name:'自由创作',subtitle:'把你脑海中的可爱，拼出来',tag:'随心',category:'自由创作',difficulty:'随心',reward:60,data:Array(SIZE*SIZE).fill(0)}
];
export function usedColors(pattern){return [...new Set(pattern.data.filter(Boolean))].sort((a,b)=>a-b);}
export function progress(pattern, cells){
  let total=0, correct=0, wrong=0, placed=0;
  pattern.data.forEach((v,i)=>{if(v)total++;if(cells[i])placed++;if(v && cells[i]===v)correct++;else if(cells[i])wrong++;});
  return {total,correct,wrong,placed,percent:total?Math.floor(correct/total*100):0};
}
