// ====== CANVAS SETUP ======
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
canvas.width = 1200;
canvas.height = 800;

const BLOCK = 40;
const CHUNK_W = 12;
const CHUNK_H = 14;

let chunks = {};

// ====== BLOCK COLORS ======
const colors = {
  air:"#87CEEB",
  grass:"#3cb043",
  dirt:"#8B5A2B",
  stone:"#777",
  coal:"#222",
  iron:"#c7c7c7",
  gold:"#FFD700",
  redstone:"#ff3b3b",
  diamond:"#00FFFF",
  emerald:"#00FF90",
  lapis:"#0000FF",
  copper:"#B87333",
  quartz:"#FFFFFF"
};

// ====== PLAYER ======
let player = { x:0, y:-200, w:BLOCK, h:BLOCK, vy:0 };
let keys = {};

const GRAVITY = 0.6;
const JUMP = -12;

// ====== INVENTORY & HOTBAR ======
let inventory = [];
let hotbar = [ {name:"Starter Pickaxe", size:1}, null,null,null,null ];
let selected = 0;
let dragItem = null;

// ====== MONEY ======
let money = 0;

// ====== SHOP ======
const shopItems = [
  {name:"Better Pickaxe",size:2,cost:200,desc:"Mines 2x2 blocks"},
  {name:"Master Pickaxe",size:3,cost:600,desc:"Mines 3x3 blocks"},
  {name:"Mega Drill",size:5,cost:1200,desc:"Mines 5x5 blocks"},
  {name:"Ultimate Miner",size:10,cost:5000,desc:"Mines 10x10 blocks"},
  {name:"Titan Drill",size:20,cost:20000,desc:"Mines 20x20 blocks"},
  {name:"Colossus Drill",size:50,cost:100000,desc:"Mines 50x50 blocks"}
];

// ====== UI ELEMENTS ======
const invUI = document.getElementById("inventory");
const shopUI = document.getElementById("shop");
const sellUI = document.getElementById("sell");

const invList = document.getElementById("invList");
const hotbarDiv = document.getElementById("hotbar");
const shopList = document.getElementById("shopList");
const shopInfo = document.createElement("div");
shopUI.appendChild(shopInfo);

const buyBtn = document.createElement("button");
buyBtn.innerText = "Buy";
shopUI.appendChild(buyBtn);

// ====== BUTTONS ======
document.getElementById("invBtn").onclick=()=>{invUI.style.display="flex"; updateInv();}
document.getElementById("shopBtn").onclick=()=>{shopUI.style.display="flex"; updateShop();}
document.getElementById("sellBtn").onclick=()=>{sellUI.style.display="flex"; updateSell();}
document.getElementById("tpBtn").onclick=()=>{player.y=-200; player.vy=0;}

document.getElementById("closeInv").onclick=()=>invUI.style.display="none";
document.getElementById("closeShop").onclick=()=>shopUI.style.display="none";
document.getElementById("closeSell").onclick=()=>sellUI.style.display="none";

// ====== INPUT ======
addEventListener("keydown",e=>{
  keys[e.key.toLowerCase()] = true;
  if(e.key>='1' && e.key<='5'){
    selected = +e.key-1;
    updateHotbar();
  }
});
addEventListener("keyup",e=>keys[e.key.toLowerCase()] = false);

// ====== TERRAIN GENERATION ======
function genChunk(cx,cy){
  const key = cx+","+cy;
  if(chunks[key]) return;
  chunks[key]={};
  for(let y=0;y<CHUNK_H;y++){
    for(let x=0;x<CHUNK_W;x++){
      const gy = cy*CHUNK_H+y;
      const r = Math.random();
      let type="stone";
      if(gy<0) type="air";
      else if(gy===0) type="grass";
      else if(gy<3) type="dirt";
      else {
        if(gy>35 && r<0.01) type="diamond";
        else if(gy>30 && r<0.015) type="emerald";
        else if(gy>25 && r<0.03) type="gold";
        else if(gy>15 && r<0.05) type="redstone";
        else if(gy>10 && r<0.06) type="lapis";
        else if(gy>5 && r<0.08) type="copper";
        else if(r<0.12) type="iron";
        else if(r<0.18) type="coal";
      }
      chunks[key][x+","+y]=type;
    }
  }
}

function getBlock(x,y){
  const cx=Math.floor(x/CHUNK_W);
  const cy=Math.floor(y/CHUNK_H);
  genChunk(cx,cy);
  const chunk = chunks[cx+","+cy];
  const lx = ((x%CHUNK_W)+CHUNK_W)%CHUNK_W;
  const ly = ((y%CHUNK_H)+CHUNK_H)%CHUNK_H;
  return chunk[lx+","+ly];
}

function setBlock(x,y,val){
  const cx=Math.floor(x/CHUNK_W);
  const cy=Math.floor(y/CHUNK_H);
  genChunk(cx,cy);
  chunks[cx+","+cy][((x%CHUNK_W+CHUNK_W)%CHUNK_W)+","+((y%CHUNK_H+CHUNK_H)%CHUNK_H)] = val;
}

function solid(px,py){
  return getBlock(Math.floor(px/BLOCK),Math.floor(py/BLOCK))!="air";
}

// ====== PLAYER UPDATE ======
function update(){
  const pad=2;
  if(keys["a"] && !solid(player.x-pad,player.y) && !solid(player.x-pad,player.y+player.h-1)) player.x-=4;
  if(keys["d"] && !solid(player.x+player.w+pad,player.y) && !solid(player.x+player.w+pad,player.y+player.h-1)) player.x+=4;

  const onGround = solid(player.x+1,player.y+player.h+1) || solid(player.x+player.w-2,player.y+player.h+1);
  if(keys["w"] && onGround) player.vy=JUMP;

  player.vy+=GRAVITY;
  let newY = player.y + player.vy;

  if(player.vy>0){
    if(solid(player.x+1,newY+player.h) || solid(player.x+player.w-2,newY+player.h)){
      player.vy=0;
      player.y=Math.floor((newY+player.h)/BLOCK)*BLOCK-player.h;
    } else player.y=newY;
  } else {
    if(solid(player.x+1,newY) || solid(player.x+player.w-2,newY)){
      player.vy=0;
    } else player.y=newY;
  }
}

// ====== MINING ======
canvas.addEventListener("mousedown",e=>{
  const mx = Math.floor((e.offsetX - canvas.width/2 + player.x)/BLOCK);
  const my = Math.floor((e.offsetY + (player.y - canvas.height/2))/BLOCK);
  const px = Math.floor(player.x/BLOCK);
  const py = Math.floor(player.y/BLOCK);

  if(Math.abs(mx-px)<=1 && Math.abs(my-py)<=1){
    const tool = hotbar[selected];
    if(!tool) return;
    const size = tool.size || 1;
    for(let dx=0; dx<size; dx++){
      for(let dy=0; dy<size; dy++){
        const bx = mx+dx;
        const by = my+dy;
        const b = getBlock(bx,by);
        if(b!="air"){
          addToInventory(b,1);
          setBlock(bx,by,"air");
          money += getSellValue(b);
        }
      }
    }
    updateInv();
    updateHotbar();
  }
});

// ====== SELL VALUES ======
function getSellValue(name){
  switch(name){
    case "diamond": return 100;
    case "emerald": return 90;
    case "gold": return 70;
    case "redstone": return 50;
    case "lapis": return 40;
    case "iron": return 25;
    case "coal": return 10;
    case "copper": return 15;
    default: return 5;
  }
}

// ====== INVENTORY FUNCTIONS ======
function addToInventory(name,amt){
  for(let slot of inventory){
    if(slot && slot.name===name){ slot.amount+=amt; updateInv(); updateHotbar(); return; }
  }
  inventory.push({name,amount:amt});
  updateInv();
  updateHotbar();
}

function updateInv(){
  invList.innerHTML="";
  inventory.forEach((slot,i)=>{
    const div = document.createElement("div");
    div.className="item";
    div.innerText = slot.name+" x"+slot.amount;
    div.onmousedown = ()=>{
      dragItem = {slotIndex:i,item:slot};
    };
    div.onmouseup = ()=>{
      if(dragItem){
        const temp = inventory[i];
        inventory[i]=dragItem.item;
        inventory[dragItem.slotIndex]=temp;
        dragItem=null;
        updateInv();
        updateHotbar();
      }
    };
    invList.appendChild(div);
  });
}

function updateHotbar(){
  hotbarDiv.innerHTML="";
  for(let i=0;i<5;i++){
    const slot = document.createElement("div");
    slot.className="hotbar-slot";
    if(i===selected) slot.classList.add("selected");
    slot.innerText = hotbar[i]?hotbar[i].name[0]:"";
    slot.onmousedown = ()=>{
      if(dragItem){
        hotbar[i] = dragItem.item;
        inventory.splice(dragItem.slotIndex,1);
        dragItem = null;
        updateHotbar(); updateInv();
      } else if(hotbar[i]){
        dragItem = {slotIndex:i,item:hotbar[i]};
        hotbar[i]=null;
        updateHotbar();
      }
    };
    hotbarDiv.appendChild(slot);
  }
}

// ====== SHOP ======
let selectedShop = null;
function updateShop(){
  shopList.innerHTML="";
  shopItems.forEach(item=>{
    const d = document.createElement("div");
    d.className="item";
    d.innerText = item.name;
    d.onclick = ()=>{
      selectedShop = item;
      shopInfo.innerText = `${item.name} - $${item.cost}\n${item.desc}`;
    };
    shopList.appendChild(d);
  });
}

buyBtn.onclick = ()=>{
  if(selectedShop && money>=selectedShop.cost){
    money -= selectedShop.cost;
    hotbar[selected] = {name:selectedShop.name, size:selectedShop.size};
    updateHotbar();
  }
};

// ====== SELL UI ======
function updateSell(){
  const div = document.getElementById("sellList");
  div.innerHTML="";
  inventory.forEach((slot,i)=>{
    const d = document.createElement("div");
    d.className="item";
    d.innerText = `${slot.name} x${slot.amount} Sell`;
    d.onclick = ()=>{
      money += slot.amount*getSellValue(slot.name);
      inventory.splice(i,1);
      updateSell(); updateInv(); updateHotbar();
    };
    div.appendChild(d);
  });
}

// ====== DRAW ======
function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const camY = player.y - canvas.height/2;
  for(let y=-15;y<25;y++){
    for(let x=-20;x<20;x++){
      const gx = Math.floor(player.x/BLOCK)+x;
      const gy = Math.floor(camY/BLOCK)+y;
      const b = getBlock(gx,gy);
      ctx.fillStyle = colors[b];
      ctx.fillRect(gx*BLOCK-player.x+canvas.width/2,gy*BLOCK-camY,BLOCK,BLOCK);
    }
  }
  ctx.fillStyle="red";
  ctx.fillRect(canvas.width/2,canvas.height/2,player.w,player.h);

  // Info
  ctx.fillStyle="black";
  ctx.font = "20px sans-serif";
  ctx.fillText(`X:${Math.floor(player.x/BLOCK)} Y:${Math.floor(player.y/BLOCK)}`,10,30);
  ctx.fillText(`Money: $${money}`,10,60);
}

// ====== SAVE/LOAD ======
function saveGame(){
  const state = { player, inventory, hotbar, chunks, money };
  localStorage.setItem("miningGameSave", JSON.stringify(state));
}
function loadGame(){
  const saved = localStorage.getItem("miningGameSave");
  if(saved){
    const state = JSON.parse(saved);
    player = state.player;
    inventory = state.inventory || [];
    hotbar = state.hotbar || [ {name:"Starter Pickaxe", size:1}, null,null,null,null ];
    chunks = state.chunks || {};
    money = state.money || 0;
    updateInv(); updateHotbar();
  }
}
loadGame();
setInterval(saveGame,5000);

// ====== MAIN LOOP ======
function loop(){ update(); draw(); requestAnimationFrame(loop); }
loop();