import { tracker } from '../src/battle/BattleStateTracker';
import { initUI } from '../src/content/ui-injector';
import '../src/styles/content.css';
tracker.processLine('|request|' + JSON.stringify({side:{id:'p1',pokemon:[{ident:'p1: Charizard',details:'Charizard, L80',condition:'240/300',active:true,baseAbility:'blaze',item:'heavydutyboots',moves:['flamethrower']}]}}));
tracker.processLine('|switch|p2a: Sawsbuck|Sawsbuck-Winter, L84|76/100');
tracker.processLine('|move|p2a: Sawsbuck|Swords Dance|p2a: Sawsbuck');
tracker.processLine('|-boost|p2a: Sawsbuck|atk|2');
tracker.processLine('|turn|4');
initUI();
