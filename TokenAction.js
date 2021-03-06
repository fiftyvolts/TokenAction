var tokenAction = tokenAction || (function() {
    'use strict';

    var version = '0.2.5-forked-0.5',
        sheetVersion = '5th Edition OGL by Roll20 2.0',
        
	    checkInstall = function() {
            log('TokenAction v'+version+' is ready!  Designed for use with the '+sheetVersion+' character sheet!');
	    },
	    
	    getSelectedCharacters = function(selected) {
            return _.chain(selected)
		        .map(function(s){
                    return getObj(s._type,s._id);
		        })
		        .reject(_.isUndefined)
		        .map(function(c){
                    return getObj('character', c.get('represents'));
		        })
		        .filter(_.identity)
		        .value();        
	    },
	    
	    createAbility = function(name, pattern, id) {
            var checkAbility = findObjs({_type: 'ability', _characterid: id, name: name});
            
            if (checkAbility[0]) {
		        checkAbility[0].set({action: pattern});
            } else {
		        createObj('ability', {name: name, action: pattern, characterid: id, istokenaction: true});
            }
	    },
	    
	    createRepeating = function(name, pattern, id) {
            var repeatingAttrs = filterObjs(function(o){
		        return o.get('type')==='attribute' && o.get('characterid') === id && o.get('name').match(name);
            });
            
            _.each(repeatingAttrs,function(attr){
		        var repeatingId = attr.get('name').split('_')[2],
                    repeatingName = attr.get('current'),
                    repeatingAction = "%{" + id + "|" + (pattern.replace(/%%RID%%/g,repeatingId)) + "}",
                    checkAbility = findObjs({_type: 'ability', _characterid: id, name: repeatingName});
                
		        if (checkAbility[0]) {
                    checkAbility[0].set({action: repeatingAction});
		        } else {
                    createObj("ability", {name: repeatingName, action: repeatingAction, characterid: id, istokenaction: true});
		        }
            });
	    },
	    
	    isNpc = function(id) {
            var checkNpc = findObjs({_type: 'attribute', _characterid: id, name: 'npc'});
            if (_.isUndefined(checkNpc[0])) {
		        return false;
            } else {
		        return checkNpc[0].get('current');
            }
	    },
	    
	    deleteAbilities = function(id) {
            var abilities = findObjs ({_type: 'ability', _characterid: id});
            _.each(abilities, function(r) {
		        r.remove();
            });
	    },
	    
	    createSpell = function(id) {
            var checkAbility = findObjs({_type: 'ability', _characterid: id, name: 'Spells'}),
		        repeatingAttrs = filterObjs(function(o){
                    return o.get('type') === 'attribute' && o.get('characterid') === id && o.get('name').match(/repeating_spell-[^{(np)][\S+_[^_]+_spellname\b/);
		        }),
		        spellText = "",
		        sk = [],
		        sb = {
                    'Cantrips': [],
                    '1st': [],
                    '2nd': [],
                    '3rd': [],
                    '4th': [],
                    '5th': [],
                    '6th': [],
                    '7th': [],
                    '8th': [],
                    '9th': []
		        };
	        
            if (!repeatingAttrs[0]) {
		        return;
            }
            
            _.each(repeatingAttrs, function(s){
		        var nameParts = s.get('name').split('_');
		        var level = nameParts[1].replace('spell-', '');
	            var spellname = nameParts.slice(0,3).join('_');
		        
		        var flagStr = (
                    (checkSpellFlag(id, spellname, 'spellcomp_v') ? 'v' : '\xa0') +
			            (checkSpellFlag(id, spellname, 'spellcomp_s') ? 's' : '\xa0') +
			            (checkSpellFlag(id, spellname, 'spellcomp_m') ? 'm' : '\xa0') +
			            (checkSpellFlag(id, spellname, 'spellconcentration') ? 'c' : '\xa0') +
			            (checkSpellFlag(id, spellname, 'spellritual') ? 'r' : '\xa0') +
			            (checkSpellFlag(id, spellname, 'innate') ? 'i' : '\xa0'));
		        
		        var displayName = s.get('current');
		        var displayWidth = 23 - flagStr.length - 1;
		        if (displayName.length > displayWidth) {
                    displayName = displayName.substring(0, displayWidth - 1) + "/";
		        }
		        while (displayName.length < displayWidth) {
                    displayName += "\xa0";
		        }
		        
		        var apiButton = "``[" + displayName + "\xa0|" + flagStr + "](~" + spellname + "_spell)``";
		        
		        var displayLevel = "?";
		        if (level === "cantrip") {
                    displayLevel = "Cantrips";
		        } else if (level == "1") {
                    displayLevel = "1st";
		        } else if (level == "2") {
                    displayLevel = "2nd";
		        } else if (level == "3") {
                    displayLevel = "3rd";
		        } else if (level == "4") {
                    displayLevel = "4th";
		        } else if (level == "5") {
                    displayLevel = "5th";
		        } else if (level == "6") {
                    displayLevel = "6th";
		        } else if (level == "7") {
                    displayLevel = "7th";
		        } else if (level == "8") {
                    displayLevel = "8th";
		        } else if (level == "9") {
                    displayLevel = "9th";
		        }
		        
		        sb[displayLevel].push(apiButton);
            });
            
            sk = _.keys(sb);
            
            _.each(sk, function(e){
		        if (_.isEmpty(sb[e])){
                    sb = _.omit(sb, e);
		        }
            });
            
            sk = _.keys(sb);
            
            _.each(sk, function(e){
		        var level = /\d+/.exec(e);
		        if (e == 'Cantrips') {
                    var displayLevel = e + '---------+------';
		        } else {
                    var displayLevel = (e + '-@{lvl' + level + '_slots_expended}/@{lvl' + level + '_slots_total}' +
					                    '----------+------');
		        }
		        spellText += "``" + displayLevel + "``\n" + sb[e].join('\n') + "\n";
            });
            
            if (checkAbility[0]) {
		        checkAbility[0].set({action: "/w @{character_name} &{template:npcatk} {{description=" + spellText + "}}"});
            } else {
		        createObj("ability", {name: 'Spells', action: "/w @{character_name} &{template:npcatk} {{description=" + spellText + "}}", characterid: id, istokenaction: true});
            }
	    },
        
	    checkSpellFlag = function(id, name, flag) {
            return getAttrByName(id, [name, flag].join('_'), "current") != 0;
	    },
	    
	    createTraits = function(id) {
            var checkAbility = findObjs({_type: 'ability', _characterid: id, name: 'Traits'});
            var repeatingAttrs = filterObjs(function(o){
                return o.get('type') === 'attribute' &&
                    o.get('characterid') === id && 
                    o.get('name').match(/^repeating_traits_[^_]+_name/)
            });
            
            var traitText = "";
            _.each(repeatingAttrs, function(t) {
		        var nameId = t.get('name');
		        var actionId = nameId.replace(/_name$/, '_output');
		        var name = t.get('current');
		        while (name.length < 25) {
                    name += '\xa0';
		        }
		        traitText += '``[' + name + '](~' + id + '|' + actionId + ')``\n';
            });
            traitText += '``------------------------``\n'
            traitText += '``AC:[[0+@{ac}]] PB:+[[0+@{pb}]] Sp:[[0+@{speed}]]``\n';
            traitText += '``Pr:[[10+@{perception_bonus}]] Is:[[10+@{insight_bonus}]] Iv:[[10+@{investigation_bonus}]]``\n';
            
            if (checkAbility[0]) {
		        checkAbility[0].set({action: "/w @{character_name} &{template:npcatk} {{description=" + traitText + "}}"});
            } else {
		        createObj("ability", {name: 'Traits', 
                                      action: "/w @{character_name} &{template:npcatk} {{description=" + traitText + "}}",
                                      characterid: id,
                                      istokenaction: true});
            }
	    },
	    sortRepeating = function(name, pattern, id) {
            var repeatingAttrs = filterObjs(function(o){
		        return o.get('type')==='attribute' && o.get('characterid') === id && o.get('name').match(name);
            }),
		        sorted = _.sortBy(repeatingAttrs, (o)=> o.get('current'));
            
            _.each(sorted,function(attr){
		        var repeatingId = attr.get('name').split('_')[2],
                    repeatingName = "a-"+attr.get('current'),
                    repeatingAction = "%{" + id + "|" + (pattern.replace(/%%RID%%/g,repeatingId)) + "}";
                if (pattern.match('npcaction-l')){
                    repeatingName = "al-"+attr.get('current');
                }
                var checkAbility = findObjs({_type: 'ability', _characterid: id, name: repeatingName});
                if (checkAbility[0]) {
                    checkAbility[0].set({action: repeatingAction});
                } else {
                    createObj("ability", {name: repeatingName, action: repeatingAction, characterid: id, istokenaction: true});
                }
            });
	    },
	    
        getCharsAndGraphics = function(selected) {
            return (_.chain(selected)
		            .map(function(s){
                        return getObj(s._type,s._id);
		            })
		            .reject(_.isUndefined)
		            .map(function(c) {
                        return [getObj('character', c.get('represents')), c];
		            })
		            .filter(function(pair) {
                        return pair[0] !== undefined;
		            })
		            .value());
        },
        
	    npcInit = function(selected) {
            var charsAndGraphics = getCharsAndGraphics(selected);
            var turns = {};
            
	        _.each(charsAndGraphics, function(pair) {
		        var char = pair[0];
		        var graphic = pair[1];
		        
		        if (isNpc(char.id)) {
                    createAndSetAttr(char, 'wtype', '', true);
                    createAndSetAttr(char, 'rtype', '{{always=1}} {{r2=[[@{d20}', true);
                    createAndSetAttr(char, 'dtype', 'full', true);
                    createAndSetAttr(char, 'npc_name_flag', '0', true);
                    
                    var init_bonus = findObjs({'type': 'attribute',
                                               'characterid': char.id,
                                               'name': "initiative_bonus"});
                    
                    var mod = init_bonus.length > 0 ? init_bonus[0].get('current') : 0;
                    
                    turns[graphic.id] = {
			            id: graphic.id,
			            pr: String((randomInteger(20) + parseFloat(mod)).toFixed(2)).replace(/\.?0+$/,""),
			            custom: ""
                    };
		        }
            });
            
            var turnorder;
            if(Campaign().get("turnorder") == "") turnorder = [];
            else turnorder = JSON.parse(Campaign().get("turnorder"));
            
            turnorder = _.filter(turnorder, function(t) { return !(t.id in turns); });
            _.each(turns, function(t) { turnorder.push(t); });
            
            Campaign().set("turnorder", JSON.stringify(turnorder));
            
	    },

	    createAndSetAttr = function(char, attr_name, value, is_current) {  
            var attr = findObjs({'type': 'attribute',
				                 'characterid': char.id,
				                 'name': attr_name});
            
            if (attr.length == 0) {
		        var obj = {'characterid': char.id,
			               'name': attr_name};
		        if (is_current) {
                    obj['current'] = value;
                    obj['max'] = '';
		        } else {
                    obj['current'] = '';
                    obj['max'] = value;
		        }           
		        createObj('attribute', obj);
		        
            } else {
		        if (is_current) {
                    attr[0].set('current', value);
		        } else {
                    attr[0].set('max', value);
		        }
            }
	    },
	    
	    prefixName = function(msg) {
	        var parts = msg.content.split(/\s/);
	        if (parts.length < 2) {
		        return;
	        }

	        var prefix = parts[1];
            var pairs =  getCharsAndGraphics(msg.selected);
            
	        _.each(pairs, function(pair) {
                var char = pair[0];
                var id = char.id;
                var graphic = pair[1];
                
		        if (isNpc(id)) {
                    var attr = 'npc_name';
		        } else {
                    var attr = 'character_name';
		        }
                
                var name = getAttrByName(id, attr, '');

                createAndSetAttr(char, attr, prefix + ' ' + name, true);
                char.set('name', name);
                graphic.set('name', name);
                setDefaultTokenForCharacter(char, graphic);
	        });
	    },
	    
        prepForExport = function(selected) {
            _.each(selected, function(char) {
                var id = char.id;
                var name = isNpc(id) ? getAttrByName(id, 'npc_name') :
                    getAttrByName(id, 'character_name');

                char.set('inplayerjournals', 'all');
                char.set('controlledby', 'all');
                
                var abilities = findObjs({type: 'ability', _characterid: id});
                _.each(abilities, function(ability) {
                    var action = ability.get('action');
                    var updated = action.split(id).join(name);
                    ability.set('action', updated);
                });
            });
        },
    
	    handleInput = function(msg) {
            var char;
            
	        if (msg.type === 'api' && msg.content.search(/^!ta\b/) !== -1 && msg.selected) {
		        char = _.uniq(getSelectedCharacters(msg.selected));
		        
		        _.each(char, function(a) {
		            if (isNpc(a.id) == "1") {
			            createAbility('Init', "%{" + a.id + "|npc_init}", a.id);
			            createAbility('Check', "@{selected|wtype}&{template:npc} @{selected|npc_name_flag} @{selected|rtype}+?{Ability|Acrobatics,[[@{selected|npc_acrobatics}]]]]&" + "#125;&" + "#125; {{r1=[[@{selected|d20}+[[@{selected|npc_acrobatics}]]]]&" + "#125;&" + "#125; {{mod=[[[[@{selected|npc_acrobatics}]]]]&" + "#125;&" + "#125; {{rname=Acrobatics&" + "#125;&" + "#125; {{type=Skill&" + "#125;&" + "#125; |Animal Handling,[[@{selected|npc_animal_handling}]]]]&" + "#125;&" + "#125; {{r1=[[@{selected|d20}+[[@{selected|npc_animal_handling}]]]]&" + "#125;&" + "#125; {{mod=[[[[@{selected|npc_animal_handling}]]]]&" + "#125;&" + "#125; {{rname=Animal Handling&" + "#125;&" + "#125; {{type=Skill&" + "#125;&" + "#125; |Arcana,[[@{selected|npc_arcana}]]]]&" + "#125;&" + "#125; {{r1=[[@{selected|d20}+[[@{selected|npc_arcana}]]]]&" + "#125;&" + "#125; {{mod=[[[[@{selected|npc_arcana}]]]]&" + "#125;&" + "#125; {{rname=Arcana&" + "#125;&" + "#125; {{type=Skill&" + "#125;&" + "#125; |Athletics,[[@{selected|npc_athletics}]]]]&" + "#125;&" + "#125; {{r1=[[@{selected|d20}+[[@{selected|npc_athletics}]]]]&" + "#125;&" + "#125; {{mod=[[[[@{selected|npc_athletics}]]]]&" + "#125;&" + "#125; {{rname=Athletics&" + "#125;&" + "#125; {{type=Skill&" + "#125;&" + "#125; |Deception,[[@{selected|npc_deception}]]]]&" + "#125;&" + "#125; {{r1=[[@{selected|d20}+[[@{selected|npc_deception}]]]]&" + "#125;&" + "#125; {{mod=[[[[@{selected|npc_deception}]]]]&" + "#125;&" + "#125; {{rname=Deception&" + "#125;&" + "#125; {{type=Skill&" + "#125;&" + "#125; |History,[[@{selected|npc_history}]]]]&" + "#125;&" + "#125; {{r1=[[@{selected|d20}+[[@{selected|npc_history}]]]]&" + "#125;&" + "#125; {{mod=[[[[@{selected|npc_history}]]]]&" + "#125;&" + "#125; {{rname=History&" + "#125;&" + "#125; {{type=Skill&" + "#125;&" + "#125; |Insight,[[@{selected|npc_insight}]]]]&" + "#125;&" + "#125; {{r1=[[@{selected|d20}+[[@{selected|npc_insight}]]]]&" + "#125;&" + "#125; {{mod=[[[[@{selected|npc_insight}]]]]&" + "#125;&" + "#125; {{rname=Insight&" + "#125;&" + "#125; {{type=Skill&" + "#125;&" + "#125; |Intimidation,[[@{selected|npc_intimidation}]]]]&" + "#125;&" + "#125; {{r1=[[@{selected|d20}+[[@{selected|npc_intimidation}]]]]&" + "#125;&" + "#125; {{mod=[[[[@{selected|npc_intimidation}]]]]&" + "#125;&" + "#125; {{rname=Intimidation&" + "#125;&" + "#125; {{type=Skill&" + "#125;&" + "#125; |Investigation,[[@{selected|npc_investigation}]]]]&" + "#125;&" + "#125; {{r1=[[@{selected|d20}+[[@{selected|npc_investigation}]]]]&" + "#125;&" + "#125; {{mod=[[[[@{selected|npc_investigation}]]]]&" + "#125;&" + "#125; {{rname=Investigation&" + "#125;&" + "#125; {{type=Skill&" + "#125;&" + "#125; |Medicine,[[@{selected|npc_medicine}]]]]&" + "#125;&" + "#125; {{r1=[[@{selected|d20}+[[@{selected|npc_medicine}]]]]&" + "#125;&" + "#125; {{mod=[[[[@{selected|npc_medicine}]]]]&" + "#125;&" + "#125; {{rname=Medicine&" + "#125;&" + "#125; {{type=Skill&" + "#125;&" + "#125; |Nature,[[@{selected|npc_nature}]]]]&" + "#125;&" + "#125; {{r1=[[@{selected|d20}+[[@{selected|npc_nature}]]]]&" + "#125;&" + "#125; {{mod=[[[[@{selected|npc_nature}]]]]&" + "#125;&" + "#125; {{rname=Nature&" + "#125;&" + "#125; {{type=Skill&" + "#125;&" + "#125; |Perception,[[@{selected|npc_perception}]]]]&" + "#125;&" + "#125; {{r1=[[@{selected|d20}+[[@{selected|npc_perception}]]]]&" + "#125;&" + "#125; {{mod=[[[[@{selected|npc_perception}]]]]&" + "#125;&" + "#125; {{rname=Perception&" + "#125;&" + "#125; {{type=Skill&" + "#125;&" + "#125; |Performance,[[@{selected|npc_performance}]]]]&" + "#125;&" + "#125; {{r1=[[@{selected|d20}+[[@{selected|npc_performance}]]]]&" + "#125;&" + "#125; {{mod=[[[[@{selected|npc_performance}]]]]&" + "#125;&" + "#125; {{rname=Performance&" + "#125;&" + "#125; {{type=Skill&" + "#125;&" + "#125; |Persuasion,[[@{selected|npc_persuasion}]]]]&" + "#125;&" + "#125; {{r1=[[@{selected|d20}+[[@{selected|npc_persuasion}]]]]&" + "#125;&" + "#125; {{mod=[[[[@{selected|npc_persuasion}]]]]&" + "#125;&" + "#125; {{rname=Persuasion&" + "#125;&" + "#125; {{type=Skill&" + "#125;&" + "#125; |Religion,[[@{selected|npc_religion}]]]]&" + "#125;&" + "#125; {{r1=[[@{selected|d20}+[[@{selected|npc_religion}]]]]&" + "#125;&" + "#125; {{mod=[[[[@{selected|npc_religion}]]]]&" + "#125;&" + "#125; {{rname=Religion&" + "#125;&" + "#125; {{type=Skill&" + "#125;&" + "#125; |Sleight of Hand,[[@{selected|npc_sleight_of_hand}]]]]&" + "#125;&" + "#125; {{r1=[[@{selected|d20}+[[@{selected|npc_sleight_of_hand}]]]]&" + "#125;&" + "#125; {{mod=[[[[@{selected|npc_sleight_of_hand}]]]]&" + "#125;&" + "#125; {{rname=Sleight of Hand&" + "#125;&" + "#125; {{type=Skill&" + "#125;&" + "#125; |Stealth,[[@{selected|npc_stealth}]]]]&" + "#125;&" + "#125; {{r1=[[@{selected|d20}+[[@{selected|npc_stealth}]]]]&" + "#125;&" + "#125; {{mod=[[[[@{selected|npc_stealth}]]]]&" + "#125;&" + "#125; {{rname=Stealth&" + "#125;&" + "#125; {{type=Skill&" + "#125;&" + "#125; |Survival,[[@{selected|npc_survival}]]]]&" + "#125;&" + "#125; {{r1=[[@{selected|d20}+[[@{selected|npc_survival}]]]]&" + "#125;&" + "#125; {{mod=[[[[@{selected|npc_survival}]]]]&" + "#125;&" + "#125; {{rname=Survival&" + "#125;&" + "#125; {{type=Skill&" + "#125;&" + "#125; |Strength,[[@{selected|strength_mod}]][STR]]]&" + "#125;&" + "#125; {{rname=Strength&" + "#125;&" + "#125; {{mod=[[[[@{selected|strength_mod}]][STR]]]&" + "#125;&" + "#125; {{r1=[[@{selected|d20}+[[@{selected|strength_mod}]][STR]]]&" + "#125;&" + "#125; {{type=Ability&" + "#125;&" + "#125; |Dexterity,[[@{selected|dexterity_mod}]][DEX]]]&" + "#125;&" + "#125; {{rname=Dexterity&" + "#125;&" + "#125; {{mod=[[[[@{selected|dexterity_mod}]][DEX]]]&" + "#125;&" + "#125; {{r1=[[@{selected|d20}+[[@{selected|dexterity_mod}]][DEX]]]&" + "#125;&" + "#125; {{type=Ability&" + "#125;&" + "#125; |Constitution,[[@{selected|constitution_mod}]][CON]]]&" + "#125;&" + "#125; {{rname=Constitution&" + "#125;&" + "#125; {{mod=[[[[@{selected|constitution_mod}]][CON]]]&" + "#125;&" + "#125; {{r1=[[@{selected|d20}+[[@{selected|constitution_mod}]][CON]]]&" + "#125;&" + "#125; {{type=Ability&" + "#125;&" + "#125; |Intelligence,[[@{selected|intelligence_mod}]][INT]]]&" + "#125;&" + "#125; {{rname=Intelligence&" + "#125;&" + "#125; {{mod=[[[[@{selected|intelligence_mod}]][INT]]]&" + "#125;&" + "#125; {{r1=[[@{selected|d20}+[[@{selected|intelligence_mod}]][INT]]]&" + "#125;&" + "#125; {{type=Ability&" + "#125;&" + "#125; |Wisdom,[[@{selected|wisdom_mod}]][WIS]]]&" + "#125;&" + "#125; {{rname=Wisdom&" + "#125;&" + "#125; {{mod=[[[[@{selected|wisdom_mod}]][WIS]]]&" + "#125;&" + "#125; {{r1=[[@{selected|d20}+[[@{selected|wisdom_mod}]][WIS]]]&" + "#125;&" + "#125; {{type=Ability&" + "#125;&" + "#125; |Charisma,[[@{selected|charisma_mod}]][CHA]]]&" + "#125;&" + "#125; {{rname=Charisma&" + "#125;&" + "#125; {{mod=[[[[@{selected|charisma_mod}]][CHA]]]&" + "#125;&" + "#125; {{r1=[[@{selected|d20}+[[@{selected|charisma_mod}]][CHA]]]&" + "#125;&" + "#125; {{type=Ability&" + "#125;&" + "#125;}", a.id);
			            createAbility('Save', "@{selected|wtype}&{template:npc} @{selected|npc_name_flag} @{selected|rtype}+?{Save|Strength,[[@{selected|npc_str_save}]]]]&" + "#125;&" + "#125; {{r1=[[@{selected|d20}+[[@{selected|npc_str_save}]]]]&" + "#125;&" + "#125; {{mod=[[@{selected|npc_str_save}]]&" + "#125;&" + "#125;{{rname=Strength Save&" + "#125;&" + "#125; {{type=Save&" + "#125;&" + "#125; |Dexterity,[[@{selected|npc_dex_save}]]]]&" + "#125;&" + "#125; {{r1=[[@{selected|d20}+[[@{selected|npc_dex_save}]]]]&" + "#125;&" + "#125; {{mod=[[@{selected|npc_dex_save}]]&" + "#125;&" + "#125;{{rname=Dexterity Save&" + "#125;&" + "#125; {{type=Save&" + "#125;&" + "#125; |Constitution,[[@{selected|npc_con_save}]]]]&" + "#125;&" + "#125; {{r1=[[@{selected|d20}+[[@{selected|npc_con_save}]]]]&" + "#125;&" + "#125; {{mod=[[@{selected|npc_con_save}]]&" + "#125;&" + "#125;{{rname=Constitution Save&" + "#125;&" + "#125; {{type=Save&" + "#125;&" + "#125; |Intelligence,[[@{selected|npc_int_save}]]]]&" + "#125;&" + "#125; {{r1=[[@{selected|d20}+[[@{selected|npc_int_save}]]]]&" + "#125;&" + "#125; {{mod=[[@{selected|npc_int_save}]]&" + "#125;&" + "#125;{{rname=Intelligence Save&" + "#125;&" + "#125; {{type=Save&" + "#125;&" + "#125; |Wisdom,[[@{selected|npc_wis_save}]]]]&" + "#125;&" + "#125; {{r1=[[@{selected|d20}+[[@{selected|npc_wis_save}]]]]&" + "#125;&" + "#125; {{mod=[[@{selected|npc_wis_save}]]&" + "#125;&" + "#125;{{rname=Wisdom Save&" + "#125;&" + "#125; {{type=Save&" + "#125;&" + "#125; |Charisma,[[@{selected|npc_cha_save}]]]]&" + "#125;&" + "#125; {{r1=[[@{selected|d20}+[[@{selected|npc_cha_save}]]]]&" + "#125;&" + "#125; {{mod=[[@{selected|npc_cha_save}]]&" + "#125;&" + "#125;{{rname=Charisma Save&" + "#125;&" + "#125; {{type=Save&" + "#125;&" + "#125;}", a.id);	
			            createRepeating(/repeating_npcaction_[^_]+_name\b/, 'repeating_npcaction_%%RID%%_npc_action', a.id);
			            createRepeating(/repeating_npcaction-l_[^_]+_name\b/, 'repeating_npcaction-l_%%RID%%_npc_action', a.id);
			            createSpell(a.id);
		            } else {
			            createAbility('Init', "%{" + a.id + "|initiative}", a.id);
			            createAbility('Check', "@{selected|wtype}&{template:simple} @{selected|rtype}?{Ability|Acrobatics, +@{selected|acrobatics_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; {{rname=Acrobatics&" + "#125;&" + "#125; {{mod=@{selected|acrobatics_bonus}&" + "#125;&" + "#125; {{r1=[[ @{selected|d20} + @{selected|acrobatics_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; |Animal Handling, +@{selected|animal_handling_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; {{rname=Animal Handling&" + "#125;&" + "#125; {{mod=@{selected|animal_handling_bonus}&" + "#125;&" + "#125; {{r1=[[ @{selected|d20} + @{selected|animal_handling_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; |Arcana, +@{selected|arcana_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; {{rname=Arcana&" + "#125;&" + "#125; {{mod=@{selected|arcana_bonus}&" + "#125;&" + "#125; {{r1=[[ @{selected|d20} + @{selected|arcana_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; |Athletics, +@{selected|athletics_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; {{rname=Athletics&" + "#125;&" + "#125; {{mod=@{selected|athletics_bonus}&" + "#125;&" + "#125; {{r1=[[ @{selected|d20} + @{selected|athletics_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; |Deception, +@{selected|deception_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; {{rname=Deception&" + "#125;&" + "#125; {{mod=@{selected|deception_bonus}&" + "#125;&" + "#125; {{r1=[[ @{selected|d20} + @{selected|deception_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; |History, +@{selected|history_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; {{rname=History&" + "#125;&" + "#125; {{mod=@{selected|history_bonus}&" + "#125;&" + "#125; {{r1=[[ @{selected|d20} + @{selected|history_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; |Insight, +@{selected|insight_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; {{rname=Insight&" + "#125;&" + "#125; {{mod=@{selected|insight_bonus}&" + "#125;&" + "#125; {{r1=[[ @{selected|d20} + @{selected|insight_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; |Intimidation, +@{selected|intimidation_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; {{rname=Intimidation&" + "#125;&" + "#125; {{mod=@{selected|intimidation_bonus}&" + "#125;&" + "#125; {{r1=[[ @{selected|d20} + @{selected|intimidation_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; |Investigation, +@{selected|investigation_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; {{rname=Investigation&" + "#125;&" + "#125; {{mod=@{selected|investigation_bonus}&" + "#125;&" + "#125; {{r1=[[ @{selected|d20} + @{selected|investigation_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; |Medicine, +@{selected|medicine_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; {{rname=Medicine&" + "#125;&" + "#125; {{mod=@{selected|medicine_bonus}&" + "#125;&" + "#125; {{r1=[[ @{selected|d20} + @{selected|medicine_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; |Nature, +@{selected|nature_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; {{rname=Nature&" + "#125;&" + "#125; {{mod=@{selected|nature_bonus}&" + "#125;&" + "#125; {{r1=[[ @{selected|d20} + @{selected|nature_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; |Perception, +@{selected|perception_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; {{rname=Perception&" + "#125;&" + "#125; {{mod=@{selected|perception_bonus}&" + "#125;&" + "#125; {{r1=[[ @{selected|d20} + @{selected|perception_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; |Performance, +@{selected|performance_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; {{rname=Performance&" + "#125;&" + "#125; {{mod=@{selected|performance_bonus}&" + "#125;&" + "#125; {{r1=[[ @{selected|d20} + @{selected|performance_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; |Persuasion, +@{selected|persuasion_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; {{rname=Persuasion&" + "#125;&" + "#125; {{mod=@{selected|persuasion_bonus}&" + "#125;&" + "#125; {{r1=[[ @{selected|d20} + @{selected|persuasion_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; |Religion, +@{selected|religion_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; {{rname=Religion&" + "#125;&" + "#125; {{mod=@{selected|religion_bonus}&" + "#125;&" + "#125; {{r1=[[ @{selected|d20} + @{selected|religion_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; |Sleight of Hand, +@{selected|sleight_of_hand_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; {{rname=Sleight of Hand&" + "#125;&" + "#125; {{mod=@{selected|sleight_of_hand_bonus}&" + "#125;&" + "#125; {{r1=[[ @{selected|d20} + @{selected|sleight_of_hand_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; |Stealth, +@{selected|stealth_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; {{rname=Stealth&" + "#125;&" + "#125; {{mod=@{selected|stealth_bonus}&" + "#125;&" + "#125; {{r1=[[ @{selected|d20} + @{selected|stealth_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; |Survival, +@{selected|survival_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; {{rname=Survival&" + "#125;&" + "#125; {{mod=@{selected|survival_bonus}&" + "#125;&" + "#125; {{r1=[[ @{selected|d20} + @{selected|survival_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; |Strength, +@{selected|strength_mod}@{selected|jack_attr}[STR]]]&" + "#125;&" + "#125; {{rname=Strength&" + "#125;&" + "#125; {{mod=@{selected|strength_mod}@{selected|jack_bonus}&" + "#125;&" + "#125; {{r1=[[ @{selected|d20} + @{selected|strength_mod}@{selected|jack_attr}[STR]]]&" + "#125;&" + "#125; |Dexterity, +@{selected|dexterity_mod}@{selected|jack_attr}[DEX]]]&" + "#125;&" + "#125; {{rname=Dexterity&" + "#125;&" + "#125; {{mod=@{selected|dexterity_mod}@{selected|jack_bonus}&" + "#125;&" + "#125; {{r1=[[ @{selected|d20} + @{selected|dexterity_mod}@{selected|jack_attr}[DEX]]]&" + "#125;&" + "#125; |Constitution, +@{selected|constitution_mod}@{selected|jack_attr}[CON]]]&" + "#125;&" + "#125; {{rname=Constitution&" + "#125;&" + "#125; {{mod=@{selected|constitution_mod}@{selected|jack_bonus}&" + "#125;&" + "#125; {{r1=[[ @{selected|d20} + @{selected|constitution_mod}@{selected|jack_attr}[CON]]]&" + "#125;&" + "#125; |Intelligence, +@{selected|intelligence_mod}@{selected|jack_attr}[INT]]]&" + "#125;&" + "#125; {{rname=Intelligence&" + "#125;&" + "#125; {{mod=@{selected|intelligence_mod}@{selected|jack_bonus}&" + "#125;&" + "#125; {{r1=[[ @{selected|d20} + @{selected|intelligence_mod}@{selected|jack_attr}[INT]]]&" + "#125;&" + "#125; |Wisdom, +@{selected|wisdom_mod}@{selected|jack_attr}[WIS]]]&" + "#125;&" + "#125; {{rname=Wisdom&" + "#125;&" + "#125; {{mod=@{selected|wisdom_mod}@{selected|jack_bonus}&" + "#125;&" + "#125; {{r1=[[ @{selected|d20} + @{selected|wisdom_mod}@{selected|jack_attr}[WIS]]]&" + "#125;&" + "#125; |Charisma, +@{selected|charisma_mod}@{selected|jack_attr}[CHA]]]&" + "#125;&" + "#125; {{rname=Charisma&" + "#125;&" + "#125; {{mod=@{selected|charisma_mod}@{selected|jack_bonus}&" + "#125;&" + "#125; {{r1=[[ @{selected|d20} + @{selected|charisma_mod}@{selected|jack_attr}[CHA]]]&" + "#125;&" + "#125; } @{selected|global_skill_mod} @{selected|charname_output}", a.id);
			            createAbility('Save', "@{selected|wtype}&{template:simple} @{selected|rtype}?{Save|Strength, +@{selected|strength_save_bonus}@{selected|pbd_safe}]]&" + "#125;&" + "#125; {{rname=Strength Save&" + "#125;&" + "#125 {{mod=@{selected|strength_save_bonus}&" + "#125;&" + "#125; {{r1=[[@{selected|d20}+@{selected|strength_save_bonus}@{selected|pbd_safe}]]&" + "#125;&" + "#125; |Dexterity, +@{selected|dexterity_save_bonus}@{selected|pbd_safe}]]&" + "#125;&" + "#125; {{rname=Dexterity Save&" + "#125;&" + "#125 {{mod=@{selected|dexterity_save_bonus}&" + "#125;&" + "#125; {{r1=[[@{selected|d20}+@{selected|dexterity_save_bonus}@{selected|pbd_safe}]]&" + "#125;&" + "#125; |Constitution, +@{selected|constitution_save_bonus}@{selected|pbd_safe}]]&" + "#125;&" + "#125; {{rname=Constitution Save&" + "#125;&" + "#125 {{mod=@{selected|constitution_save_bonus}&" + "#125;&" + "#125; {{r1=[[@{selected|d20}+@{selected|constitution_save_bonus}@{selected|pbd_safe}]]&" + "#125;&" + "#125; |Intelligence, +@{selected|intelligence_save_bonus}@{selected|pbd_safe}]]&" + "#125;&" + "#125; {{rname=Intelligence Save&" + "#125;&" + "#125 {{mod=@{selected|intelligence_save_bonus}&" + "#125;&" + "#125; {{r1=[[@{selected|d20}+@{selected|intelligence_save_bonus}@{selected|pbd_safe}]]&" + "#125;&" + "#125; |Wisdom, +@{selected|wisdom_save_bonus}@{selected|pbd_safe}]]&" + "#125;&" + "#125; {{rname=Wisdom Save&" + "#125;&" + "#125 {{mod=@{selected|wisdom_save_bonus}&" + "#125;&" + "#125; {{r1=[[@{selected|d20}+@{selected|wisdom_save_bonus}@{selected|pbd_safe}]]&" + "#125;&" + "#125; |Charisma, +@{selected|charisma_save_bonus}@{selected|pbd_safe}]]&" + "#125;&" + "#125; {{rname=Charisma Save&" + "#125;&" + "#125 {{mod=@{selected|charisma_save_bonus}&" + "#125;&" + "#125; {{r1=[[@{selected|d20}+@{selected|charisma_save_bonus}@{selected|pbd_safe}]]&" + "#125;&" + "#125;}@{selected|global_save_mod}@{selected|charname_output}", a.id);
			            createRepeating(/repeating_attack_[^_]+_atkname\b/, 'repeating_attack_%%RID%%_attack', a.id);
			            createSpell(a.id);
			            createTraits(a.id);
		            }
		            sendChat("TokenAction", "/w " + msg.who + " Created Token Actions for " + a.get('name') + ".");
		        });
	        } else if (msg.type === 'api' && msg.content.search(/^!deleteta\b/) !== -1 && msg.selected) {
		        char = _.uniq(getSelectedCharacters(msg.selected));
		        
		        _.each(char, function(d) {
		            deleteAbilities(d.id);
		            sendChat("TokenAction", "/w " + msg.who + " Deleted Token Actions for " + d.get('name') + ".");
		        });
	        } else if (msg.type === 'api' && msg.content.search(/^!sortta\b/) !== -1 && msg.selected) {
		        char = _.uniq(getSelectedCharacters(msg.selected));
		        
		        _.each(char, function(a) {
		            if (isNpc(a.id) == "1") {
		                createAbility('Init', "%{" + a.id + "|npc_init}", a.id);
		                sortRepeating(/repeating_npcaction_[^_]+_name\b/, 'repeating_npcaction_%%RID%%_npc_action', a.id);
		                sortRepeating(/repeating_npcaction-l_[^_]+_name\b/, 'repeating_npcaction-l_%%RID%%_npc_action', a.id);
		                createSpell(a.id);
		            }
		            sendChat("TokenAction", "/w " + msg.who + " Created Token Actions for " + a.get('name') + ".");
		        });
	        } else if (msg.type === 'api' && msg.content.search(/^!spellsta\b/) !== -1 && msg.selected) {
		        char = _.uniq(getSelectedCharacters(msg.selected));
		        
		        _.each(char, function(a) {
		            createSpell(a.id);
		            sendChat("TokenAction", "/w " + msg.who + " Created Token Spell Action for " + a.get('name') + ".");
		        });
            } else if (msg.type === 'api' && msg.content.search(/!traitsta\b/) !== -1 && msg.selected) {
		        char = _.uniq(getSelectedCharacters(msg.selected));
		        _.each(char, function(a) {
                    createTraits(a.id);
                    sendChat("TokenAction", "/w " + msg.who + " Created Token Traits Action for " + a.get('name') + ".");
		        });
            } else if (msg.type = 'api' && msg.content.search(/!npcinit\b/) !== -1 && msg.selected) {
		        npcInit(msg.selected);
            } else if (msg.type = 'api' && msg.content.search(/!nameprefix\b/) !== -1 && msg.selected) {
		        prefixName(msg);
	        } else if (msg.type = 'api' && msg.content.search(/!prepforexport\b/) !== -1 && msg.selected) {
		        var chars = _.uniq(getSelectedCharacters(msg.selected));
                prepForExport(chars);
            }
	        return;
	    },

	    registerEventHandlers = function() {
            on('chat:message', handleInput);
	    };

    return {
        CheckInstall: checkInstall,
        RegisterEventHandlers: registerEventHandlers
    };
}());

on('ready',function() {
    'use strict';

    tokenAction.CheckInstall();
    tokenAction.RegisterEventHandlers();
});
