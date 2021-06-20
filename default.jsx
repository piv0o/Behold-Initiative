import React from 'react'
import ReactDOM from 'react-dom'
import fs from 'fs';
import { readFile, writeFile, readdir } from 'fs';
import { Agent, Server, get,} from 'https';
//----------------------------
// Event Handlers
//----------------------------
const keyEvents = {
    F5: (e)=>location.reload(),
}

function roll(dice){
    return Math.ceil(Math.random() * dice);
}

function calcBonus(stat){
    return Math.floor((stat - 10) / 2)
}


document.onkeydown = (event)=>{
    if(keyEvents[event.key]) keyEvents[event.key](event); 
}

window.onresize = (event)=>{
    if(609 > innerWidth){
        $(".stat-square").hide();
    } else {
        $(".stat-square").show();
    }
    
    if(477 > innerWidth){
        $(".ac-square").hide();
    } else {
        $(".ac-square").show();
    }
}
$(function(){
    window.onresize.call(window);
})
//----------------------------
// Default
//----------------------------
function fadeOutObject(id,delay){
    $(id).removeClass("d-none fade instant-fade");
    setTimeout(()=>{
        $(id).addClass("fade");
        setTimeout(()=>{
            $(id).addClass("d-none instant-fade")
                .removeClass("fade");
        },25*1000)
    },(delay||1)*1000)
}
//----------------------------
// Default
//----------------------------
/**
 * the default area of the application
 */
class Default extends React.Component{
    classList = "w-100 bg-white";

    bodyStyle={
        height: "calc(100vh - 78px)",
        overflowY:"auto"
    }

    render(){
        return <div className={this.classList}>
            <NotificationList/>
            <Navigation/>
            <div className="p-0 m-0" style={this.bodyStyle}>
                <InitiativeList/>
                <AddItemControls/>
            </div>
        </div>
    }
}

//----------------------------
// Navigation
//----------------------------

class Navigation extends React.Component{
    classList = "w-100 bg-dark row mx-0";
    styleSheet = {
    }

    constructor(){
        super()
        this.state = {
            isSearchEnabled:false,
            isSearchFocused:false,
            searchText:"",
            apiResults:[{name:"",index:"",url:""}],
            dirResults:[{name:"",index:"",url:""}]
        }

        window.toggleSearch = this.toggleSearch.bind(this);
    }

    toggleSearch(){
        this.setState((state)=>({isSearchEnabled:!state.isSearchEnabled}))
    }

    async componentDidMount(){          
        keyEvents["ArrowRight"] = this.next.bind(this);
        keyEvents["ArrowLeft"] = this.prev.bind(this);
        let apiData = await this.getApiData("/api/monsters");
        let dirs = await this.getDirData();
        this.setState({
            apiResults: apiData.results,
            dirResults: dirs
        });
    }

    render(){
        if(this.state.isSearchEnabled) return this.renderSearch();
        else return this.renderNavigation();
    }

    getApiData(param){
        return new Promise((res,rej)=>{
            get(`https://www.dnd5eapi.co${param||""}`,(apiRes)=>{
                apiRes.setEncoding("utf-8");
                let rawData = "";
                apiRes.on("data", (data) => {
                    rawData += data;
                });
                apiRes.on("end",()=>{
                    try {
                        res(JSON.parse(rawData));
                      } catch (e) {
                        rej(e);
                      }
                })
            }).on('error', (e) => {
                rej(e);
            });
        })
    }

    getDirData(param){
        return new Promise((res,rej)=>{
            readdir("./Library/",(err,files)=>{
                if(err) rej(err);
                res(files.map(file => ({name:file.replace(/\.json$/gi,""), index:file.replace(/\.json$|\W/gi,"").toLowerCase(), url:"./Library/"+file})))
            })
        })
    }

    renderSearch(){
        return <div><div className={this.classList} style={{height:"78px", display:"flex"}}>
            <input id="txtSearch" 
            autoComplete="off"
            className="w-100 search-input h1 my-auto mx-4" 
            onBlur={this.onSearchBlur.bind(this)}
            onFocus={this.onSearchFocus.bind(this)}
            onChange={this.setSearch.bind(this)}
            placeholder="search"
            />
        </div>
        <div id="myDropdown" class={"dropdown-content shadow " + this.state.isSearchFocused ? "d-block":"d-none"}>
                <div className="shadow" style={{zIndex:100,position:"absolute"}}>
                    <div className="col-12 ml-5 bg-light" style={this.getSearchStyle()}>
                        {this.getList().filter(this.filterSearch.bind(this)).map(this.renderResultRow.bind(this))}
                    </div>
                </div>
        </div>
        </div>
    }

    getList(){
        return this.state.dirResults.concat(this.state.apiResults)
    }

    getSearchStyle(){
        return {
            width: "calc(100vw - 6rem)",
            maxHeight: "calc(100vh - 88px)",
            overflowY:"auto"
        }
    }

    setSearch(event){
        this.setState({searchText:event.target.value})
    }

    filterSearch(result){
        if(!this.state.isSearchFocused||!this.state.isSearchEnabled||this.state.searchText  ==="") return false;
        return result.name.toLowerCase().includes(this.state.searchText.toLowerCase());
    }

    renderResultRow(result,index){
        return <div className={"row cursor-pointer hover-salmon pt-1 "+ (index % 2 === 0 ? "bg-white":"")} onClick={this.selectItem.bind(this,result)}>
            <div className="col-10 col-sm-11">
                <div className="d-inline-block">
                    <i class={"fas fa-chevron-right pt-1 pr-1 h5 "+(result.url.startsWith("./") ? "text-primary" : "text-danger")}/>
                    <span className="color-gray h5">{result.name||"name"}</span>
                </div>
            </div>
            <div className="col-2 col-sm-1">
                <div className="d-inline-flex justify-content-right text-right">
                    <i class={"fas fa-info-circle pt-1 pr-1 ml-auto h5 "+(result.url.startsWith("./") ? "text-primary" : "text-danger")}/>
                </div>
            </div>

            
        </div>
    }

    async selectItem(result){
        let output = {};
        if(result.url.startsWith("./")){
             output = await this.readCharacterFromFile(result.url)
        } else {
            let res = await this.getApiData(result.url);
            output = {
                name : res.name,
                hitpoints: [res["hit_points"],res["hit_points"],0],
                armorClass: res["armor_class"],
                initiative : 0,
                stats : [
                    res.strength,
                    res.dexterity,
                    res.constitution,
                    res.intelligence,
                    res.wisdom,
                    res.charisma
                ],
                portrait:`img/type-${res.type.toLowerCase()}.png`
            }
        }
        this.downloadCharacter(output);
    }

    readCharacterFromFile(url){
        console.log(url);
        return new Promise((res,rej)=>{
            readFile(url, {encoding:"utf-8"}, (err,file) =>{
                if(err) rej(err);
                res(JSON.parse(file));
            });
        })
    }

    
    downloadCharacter(res){
        let state = getApplicationState();
        res.name = res.name + " " + (state.session.filter(c => c.name.replace(/\s\d$/,"") === res.name.replace(/\s\d$/,"")).length + 1)
        state.session.push(res);
        setApplicationState(state).catch((err)=>console.warn(err));
        //this.closeModal();
        this.setState({isSearchEnabled:false,searchText:""})
    }

    onSearchFocus(){
        this.setState({isSearchFocused:true});
    }

    onSearchBlur(){
        setTimeout(()=>{
            this.setState({isSearchFocused:false});
        },250)
     
    }

    renderNavigation(){
        return <div className={this.classList} style={this.styleSheet}>
            <div className="col-4 px-1">
                <button className="btn btn-secondary my-2 mx-0 w-100" onClick={this.prev.bind(this)}>
                    <i className="fas fa-3x fa-angle-double-left"></i>
                </button>
            </div>
            <div className="col-4 px-1">
                <button className="btn btn-secondary my-2 mx-0 w-100" onClick={this.rollSessionInitiative.bind(this)}>
                    <i className="fas fa-3x fa-dice-d20"></i>
                </button>
            </div>
            <div className="col-4 px-1">
                <button className="btn btn-secondary my-2 mx-0 w-100" onClick={this.next.bind(this)}>
                    <i className="fas fa-3x fa-angle-double-right"></i>
                </button>
            </div>
        </div>
    }

    prev(){
        if($("input:focus").length > 0) return;
        let appState = getApplicationState();
        let item = appState.session.pop();
        appState.session.unshift(item);
        setApplicationState(appState);
    }

    next(){
        if($("input:focus").length > 0) return;
        let appState = getApplicationState();
        let item = appState.session.shift();
        appState.session.push(item);
        setApplicationState(appState);
    }

    rollSessionInitiative(){
        if($("input:focus").length > 0) return;
        let appState = getApplicationState();
        appState.session.forEach(char => {
            char.initiative = this.rollInitiative(char.stats[1]);
            console.log(`${char.name} rolled ${char.initiative} for initiative`)
        })
        appState.session.sort((a,b)=> b.initiative - a.initiative);
        $(".init-view").toArray().forEach((item,index)=>{
            fadeOutObject(item, (index+1)/2);
        })
        setApplicationState(appState);
    }

    rollInitiative(dex){
        return roll(20) + calcBonus(dex);
    }
}

//----------------------------
// Initiative List
//----------------------------

class InitiativeList extends React.Component{
    classList = "w-100 bg-white init-list";
    
    constructor(){
        super();
        this.state = {
            session:new Array(),
            insertIndex : -1
        };
        window.setApplicationState = this.setApplicationState.bind(this)
        window.getApplicationState = this.getState.bind(this);
    }

    async componentDidMount(){
        this.setState({session: await this.loadSession()});
    }

    loadSession(){
        return new Promise((res,rej)=>{
            readFile("./session.json", {encoding:"utf-8"}, (err,file) =>{
                if(err) rej(err);
                res(JSON.parse(file));
            });
        })
    }

    getState(){
        return this.state;
    }
    
    render(){
        return <div className={this.classList}>
            {this.getList()}
        </div>
    }

    getList(){
        return this.state.session.map((data,index)=>{
            return <InitiativeItem 
                key={index} 
                index={index}
                name={data.name} 
                hitpoints={data.hitpoints} 
                armorClass={data.armorClass} 
                initiative={data.initiative}
                stats={data.stats}
                portrait={data.portrait}
                data={data}
            />
        })
    }

    getInsertList(){
        let arr = new Array();
        this.state.session.forEach(char=>{
            arr.push(char);
        })
        //if(this.state.insertIndex > -1));
        return arr
    }

    

    setApplicationState(obj){
        return new Promise((res,rej)=>{
            this.setState(obj,(state)=>{
                writeFile("./session.json",JSON.stringify(this.state.session),"utf-8",(err)=>{
                    if(err) rej(err);
                    else res(this.state);
                })
            });
        });
    }
}



class InitiativeItem extends React.Component{
    classList = "my-1 mx-0 p-0 w-100 bg-light row init-item";
    styleSheet={height:"128px"}
    render(){
        return <div id={this.props.name.replace(/\W/g,"") + this.props.index} className={this.classList} style={this.styleSheet} title={this.props.name}>
            <GrabBar forHtml={this.props.name.replace(/\W/g,"") + this.props.index} data={this.props} index={this.props.index}/>
            <Portrait name={this.props.name} src={this.props.portrait} index={this.props.index}/>
            <InitiativeView initiative={this.props.initiative} index={this.props.index} id={"init"+this.props.name.replace(/\W/g,"") + this.props.index}/>
            <HitpointsView hitpoints={this.props.hitpoints} index={this.props.index}/>
            <ArmorClassView armorClass={this.props.armorClass} index={this.props.index} />
            <AbilityScoreView stats={this.props.stats} index={this.props.index}/>
            <ControlsMenu index={this.props.index} data={this.props.data}/>
        </div>
    }
}

class InsertPlaceholder extends React.Component{
    classList = "m-1 p-0 bg-light row placeholder";
    styleSheet={height:"0px"}
    render(){
        return <div 
            className={this.classList} 
            style={this.styleSheet}>

        </div>
    }
}
//----------------------------
// Grab Bar
//----------------------------
class GrabBar extends React.Component{
    styleSheet={
        width:"12px" ,
    }

    constructor(){
        super()
        this.state = {
            grab : false
        }
    }

    componentDidMount(){
        $(document).on("mousemove",this.updateGrab.bind(this))
        $(document).on("mouseup",this.handleUngrab.bind(this))

    }

    render(){
        return <div 
        className={this.getClassList()} 
        style={this.styleSheet} 
        onMouseDown={this.handleGrab.bind(this)}
        >

        </div>
    }

    handleGrab(event){
        if(this.state.grab) return;
        event.preventDefault();
        event.stopPropagation();
        this.initialGrab = event.target.getBoundingClientRect().y - event.pageY + scrollY ;
        this.setState({grab:true})
    }

    updateGrab(event){
        if(!this.state.grab) return;
        $(`#${this.props.forHtml}`).css({
            position:"absolute",
            zIndex:"9999",
            top: (this.initialGrab + event.pageY+"px"),
            boxShadow: "rgba(0, 0, 0, 0.65) 0px 5px 15px",
     
        }).removeClass("bg-success").addClass("grabbing")
        let items = $(".init-list .init-item").toArray();
        items.forEach((item)=>{
            $(item).removeClass("mb-128");
        })
        let item = items.find(item=>item.getBoundingClientRect().y > event.pageY - scrollY);
        $(item).addClass("mb-128")
    }

    handleUngrab(event){
        if(!this.state.grab) return;
        this.setState({grab:false},()=>{
            $(`#${this.props.forHtml}`).css({
                position:"static",
                zIndex:"auto",
                boxShadow:"none",
 
            })
            let items = $(".init-list .init-item").toArray();
            let newIndex = items.findIndex(x => x.classList.contains("mb-128"));
            if(newIndex === -1) newIndex = items.length;
            let oldIndex = this.props.index;
            let state = getApplicationState();
            state.session.splice(newIndex,0,{...this.props.data});
            state.session.splice(oldIndex + (newIndex < oldIndex ? 1 : 0),1);
            $(".init-list .init-item").removeClass("mb-128").removeClass("grabbing")
            setApplicationState(state).catch((err)=>console.warn(err));
        })
    }

    getClassList(){
        return (this.props.index === 0 ?"bg-success" :"bg-dark")+" h-100 cursor-grab";
    }
}

class Square extends React.Component{
    
    
    render(){
        return <div className={this.getClassList()} id={this.props.id} ref={this.setReference.bind(this)} onClick={this.props.onClick}>
            <div className={this.getSquareClassList()} style={this.getStyleSheet()} id={this.props.id}>
                {this.props.children}
            </div>
        </div>
    }

    getClassList(){
        return "h-100 ml-1 " + (this.props.className||"");
    }

    getSquareClassList(){
        return "w-auto m-1 portrait-box d-flex justify-content-center align-items-center " + (this.props.squareClassName || "")
    }

    getStyleSheet(){
        return this.props.style || new Object;
    }
    
    componentDidMount(){
        this.squareWidth();
        this.squareHeight();
    }

    squareWidth(){
        if(!this.element) return;
        this.$element.css({width: this.$element.height()})
    }

    squareHeight(){
        let $square = this.$element.children().first();
        $square.css({height:$square.width()});
    }

    setReference(element){
        this.element = element;
        this.$element = $(element);
    }
}

//----------------------------
// Portrait
//----------------------------

class Portrait extends React.Component{
    uploadStyle={
    }

    inputstyle={
        width:"100%",
        alignSelf:"start",
        zIndex:3,
        color:"white",
        backgroundColor:"transparent",
        border: "0px solid transparent",
        "-webkit-text-stroke-width": "1px",
        "-webkit-text-stroke-color": "black"
    }

    render(){
      return <Square style={this.getStyle()} squareClassName={"bg-center bg-100 "+(this.props.src?"":"border-dashed")} id={this.getSquareID()} onClick={this.handleUploadFile.bind(this)}>
            <div className="h-100">
            <input placeholder="name" className="font-weight-bold " style={this.inputstyle} type="text" value={this.props.name} onClick={e=>e.stopPropagation()} onChange={this.handleNameChange.bind(this)}/>
            <i className={"fas "+(!this.props.src ? "fa-plus text-center w-100 h1 color-gray color-gray-hover":"fa-trash text-center w-100 fa-5x hoverover")+" mx-0 mb-0 "} style={this.getIconStyle()}></i>
            </div>
            
            <input hidden className="d-none" type="file" onChange={this.onChange.bind(this)}/>
        </Square>
    }

    handleNameChange(event){
            let state = getApplicationState();
            state
                .session[this.props.index]
                .name = event.target.value.replace();
            setApplicationState(state).catch((err)=>console.warn(err));
    }

    getIconStyle(){
        return {
            position:"",
            paddingTop:this.props.src ? "0px": "12px",
            marginTop:this.props.src ? "-6px":"0px"

        }
    }

    handleUploadFile(event){
        if(this.props.src) {
            let isConfirm = confirm("Are you sure you want to remove the portrait?");
            if(isConfirm) this.setPortrait("");
        } else $(`#${this.getSquareID()}`).find(`input[type="file"]`).trigger("click")
    }

    getSquareID(){
        return "divPortraitContainer" + this.props.index;
    }

    getStyle(){
        if(this.props.src) return {
            background: `url("${this.props.src}")`,
            border:"1px dashed transparent"
        };
        else return this.uploadStyle;
    }

    async onChange(event){
        this.setPortrait(await this.readFile(event.target.files[0]))
    }

    readFile(file){
        return new Promise((res,rej)=>{
            const reader = new FileReader();
            reader.addEventListener("load",()=>{
                res(reader.result);
            })
            if (file) {
                reader.readAsDataURL(file);
              }
            
        })
    }

    removePortrait(event){
        this.setPortrait("");
    }

    setPortrait(src){
        let state = getApplicationState();
        state
            .session[this.props.index]
            .portrait = src;
        setApplicationState(state).catch((err)=>console.warn(err));
        
    }

}

//----------------------------
// Hit Points
//----------------------------

class HitpointsView extends React.Component{
    iconStyle={
        fontSize:"80px",
        position: "absolute"
    }
    textStyle={
        position:"", 
        zIndex:"2",
        backgroundColor:"transparent",
        border: "0px solid transparent",
        width:"100%",
        textAlign:"center"
    }
    render(){
        return <Square>
            {/*<h1 style={this.textStyle}>{this.getHitpoints()}</h1>*/}

            <div className="" style={this.getBackground()}>
            <input className="h1 my-auto" type="text" 
                style={this.textStyle} 
                value={this.props.hitpoints[0] || 0}
                onChange={this.setHitpoints.bind(this)}
            />
            </div>
            {/*<i className="fas fa-heart h1 m-0 color-hp" style={this.iconStyle}></i>*/}
        </Square>
    }

    getBackground(){
        return {
            background: `url("img/hitpoints.svg")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
            height:"80%",
            width:"80%",
            display:"flex",
        };
    }

    getHitpoints(){
        return this.props.hitpoints[0];
    }

    getMaxHitpoints(){
        return this.props.hitpoints[1];
    }

    setHitpoints(event){
        let state = getApplicationState();
        state
            .session[this.props.index]
            .hitpoints[0] = parseInt(event.target.value.replace());
        setApplicationState(state).catch((err)=>console.warn(err));
    }
}
//----------------------------
// Armor Class
//----------------------------
class ArmorClassView extends React.Component{
    iconStyle={
        fontSize:"80px",
        position: "absolute"
    }
    textStyle={
        position:"", 
        zIndex:"2",
        backgroundColor:"transparent",
        border: "0px solid transparent",
        width:"100%",
        textAlign:"center"
    }
    render(){
        return <Square className="ac-square">

            <div className="" style={this.getBackground()}>
                <input 
                    className="h1 my-auto" 
                    type="text" 
                    style={this.textStyle} 
                    value={this.props.armorClass||0}
                    onChange={this.setAC.bind(this)}
                />
            </div>
            {/*<i className="fas fa-heart h1 m-0 color-hp" style={this.iconStyle}></i>*/}
        </Square>
    }

    getBackground(){
        return {
            background: `url("img/armor.svg")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
            height:"80%",
            width:"80%",
            display:"flex"
        };
    }

    setReference(element){
        this.element = element;
        this.$element = $(element);
    }

    getAC(){
        return this.props.armorClass;
    }

    setAC(event){
        let state = getApplicationState();
        state
            .session[this.props.index]
            .armorClass = parseInt(event.target.value.replace());
        setApplicationState(state).catch((err)=>console.warn(err));
    }

    
}
//----------------------------
// Initiative
//----------------------------

class InitiativeView extends React.Component{
    iconStyle={
        fontSize:"80px",
        position: "absolute"
    }
    textStyle={
        position:"", 
        zIndex:"2",
        backgroundColor:"transparent",
        border: "0px solid transparent",
        width:"100%",
        textAlign:"center"
    }
    render(){
        return <Square id={this.props.id} className="init-view">
            {/*<h1 style={this.textStyle}>{this.getHitpoints()}</h1>*/}

            <div className="" style={this.getBackground()}>
            <input className="h1 my-auto" type="text" 
                style={this.textStyle} 
                value={this.props.initiative || 0}
                onChange={this.setInitiative.bind(this)}
            />
            </div>
            {/*<i className="fas fa-heart h1 m-0 color-hp" style={this.iconStyle}></i>*/}
        </Square>
    }

    componentDidMount(){
        $("#"+this.props.id).addClass("d-none");
    }

    getBackground(){
        return {
            background: `url("img/dice.png")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
            backgroundSize:"contain",
            height:"80%",
            width:"80%",
            display:"flex",
        };
    }

    getInitiative(){
        return this.props.initiative;
    }

    setInitiative(event){
        let state = getApplicationState();
        state
            .session[this.props.index]
            .initiative = parseInt(event.target.value.replace());
        setApplicationState(state).catch((err)=>console.warn(err));
    }
}
//----------------------------
// Ability Scores
//----------------------------

class AbilityScoreView extends React.Component{
    render(){
        return <Square className="stat-square">
            <table className="w-100 h-100 stat-table">
                <tbody>
                <tr>
                    <AbilityScoreItem type="str" stat={this.getStat(0)} statIndex={0} index={this.props.index}/>
                    <AbilityScoreItem type="dex" stat={this.getStat(1)} statIndex={1} index={this.props.index}/>
                </tr>
                <tr>
                <AbilityScoreItem type="con" stat={this.getStat(2)} statIndex={2} index={this.props.index}/>
                <AbilityScoreItem type="int" stat={this.getStat(3)} statIndex={3} index={this.props.index}/>
                </tr>
                <tr>
                    <AbilityScoreItem type="wis" stat={this.getStat(4)} statIndex={4} index={this.props.index}/>
                    <AbilityScoreItem type="cha" stat={this.getStat(5)} statIndex={5} index={this.props.index}/>
                </tr>
                </tbody>
            </table>
        </Square>
    }

    getStat(i){
        return this.props.stats[i];
    }
}

class AbilityScoreItem extends React.Component{
    constructor(){
        super();
        this.state={
            isFocused:false
        }
    }
    render(){
        //<img src={`img/${this.props.type}icon.svg`}></img>
        return <th>
            <div className="" style={this.getBackground()}>
            <input 
                type="text"
                id={this.getID()}
                className={"h5 font-weight-bold my-auto "+(this.state.isFocused ? "":"d-none")} 
                style={this.getTextStyle()} 
                title={this.getTitle()} 
                value={this.props.stat||0}
                onChange={this.setScore.bind(this)}
                onFocus={this.handleFocus.bind(this)}
                onBlur={this.handleBlur.bind(this)}
            />
            <input 
                type="text" 
                className={"h5 my-auto font-weight-bold text-outlined" +(this.state.isFocused ? "d-none":"")}
                style={this.getTextStyle()} 
                title={this.getTitle()} 
                value={this.props.stat||0}
                onChange={this.setScore.bind(this)}
                onClick={this.focusInput.bind(this)} 
                hidden={this.state.isFocused} 
                value={(this.props.stat > 9 ? "+":"")+calcBonus(this.props.stat||0)}
            />
            </div>

        </th>    
    }

    getID(){
        return "stat" + this.props.type + this.props.index;
    }

    handleBlur(){
        this.setState({isFocused:false})
    }

    handleFocus(){
        this.setState({isFocused:true})
    }

    focusInput(){
        this.setState({isFocused:true},()=>{
            document.getElementById(this.getID()).focus();     
        })
    }

    getTextStyle(){
        return  {
            zIndex:"2",
            backgroundColor:"transparent",
            border: "0px solid transparent",
            width:"50%",
            textAlign:"center",
            position:""
            /*marginTop: "-32px",
            marginLeft: "-20px"*/
        }
    }
    getTextStyle(){
        return  {
            zIndex:"2",
            backgroundColor:"transparent",
            border: "0px solid transparent",
            width:"100%",
            textAlign:"center",
            position:""
            /*marginTop: "-32px",
            marginLeft: "-20px"*/
        }
    }

    getBackground(){
        return {
            background: `url("img/${this.props.type}icon${this.state.isFocused ? "color":""}.svg") center no-repeat`,
            height:"100%",
            display:"flex"
        };
    }

    setScore(event){
        let state = getApplicationState();
        state
            .session[this.props.index]
            .stats[this.props.statIndex] = parseInt(event.target.value.replace());
        setApplicationState(state).catch((err)=>console.warn(err));
    }

    getTitle(){
        return this.getStatName() + " (" +this.props.stat+ ")";
    }



    getStatName(){
        switch(this.props.type){
            case "str": return "Strength";
            case "dex": return "Dexterity";
            case "con": return "Constitution";
            case "int": return "Inteligence";
            case "wis": return "Wisdom";
            case "cha": return "Charisma";
        }
    }
} 
//----------------------------
// Creature Controls
//----------------------------
class ControlsMenu extends React.Component{
    classList="col text-right "
    constructor(){
        super();
        this.state = {
            showModal:false
        }
    }
    render(){ //Controls for stuff like delete and stuff
        return <div className={this.classList}>
            <i className="fas fa-save color-gray color-gray-hover" onClick={this.saveCharacter.bind(this)}></i><br/>
            <i className="fas fa-copy color-gray color-gray-hover" onClick={this.copyCharacterToClipboard.bind(this)}></i><br/>
            <i className="fas fa-paste color-gray color-gray-hover" onClick={this.pasteCharacterFromClipboard.bind(this)}></i><br/>
            <i className="fas fa-info-circle color-gray color-gray-hover" onClick={this.openModal.bind(this)}></i><br/>
            <i className="fas fa-trash color-gray color-gray-hover" onClick={this.deleteCharacter.bind(this)}></i><br/>
            <InfoModal 
                hidden={!this.state.showModal} 
                closeHandler={this.closeModal.bind(this)}
                info={this.props.data}
            />
        </div>
    }

    
    closeModal(){
        this.setState({showModal:false})
    }

    openModal(){
        this.setState({showModal:true})
    }

    saveCharacter(){
        let state = getApplicationState();
        let char = state.session[this.props.index];
        writeFile(`./Library/${char.name}.json`,JSON.stringify(char),"utf-8",(err)=>{
            if(err) console.error(err);
            else console.log(`successfully saved ${char.name}`)
        })
    }

    deleteCharacter(){
        let isConfirm = confirm("Are you sure you want to permanently delete this character?");
        if(!isConfirm) return;
        let state = getApplicationState();
        state.session.splice(this.props.index,1);
        setApplicationState(state).catch((err)=>console.warn(err));
    }

    async copyCharacterToClipboard(){
        let result = await navigator.permissions.query({name: "clipboard-write"});
        if (result.state == "granted" || result.state == "prompt") {
            /* write to the clipboard now */
            let state = getApplicationState();
            let char = state.session[this.props.index];
            await navigator.clipboard.writeText(JSON.stringify(char));
        } else {
            throw "clipboard permissions denied"
        }
          
    }

    async pasteCharacterFromClipboard(){
        let state = getApplicationState();
        let char = JSON.parse(await navigator.clipboard.readText())
        char.name = char.name + " " + (state.session.filter((c,i) => c.name.replace(/\s\d$/,"") === char.name.replace(/\s\d$/,"") && i !== this.props.index).length + 1)
        state.session[this.props.index] = char;
        setApplicationState(state).catch((err)=>console.warn(err));
    }

}
//----------------------------
// List Controls
//----------------------------
class AddItemControls extends React.Component{
    classList = "m-1 p-0 row d-flex justify-content-center border-dashed align-items-center";
    styleSheet={
        height:"96px"
    };
    boxStyle={
    };
    constructor(){
        super();

    }
    render(){
        return <div className={this.classList} style={this.styleSheet}>
            <Square squareClassName="border-dashed" style={this.boxStyle} onClick={window.toggleSearch}>
                <i className="fas fa-search h1 m-0 color-gray color-gray-hover" ></i>
            </Square>
            <Square squareClassName="border-dashed" style={this.boxStyle} onClick={this.createCharacterFromClipboard.bind(this)}>
                <i className="fas fa-stamp h1 m-0 color-gray color-gray-hover" ></i>
            </Square>
            <Square squareClassName="border-dashed"  style={this.boxStyle} onClick={this.createCharacter.bind(this)}>
                <i className="fas fa-plus h1 m-0 color-gray color-gray-hover" ></i>
            </Square>
        </div>
    }

    async createCharacterFromClipboard(){
        let state = getApplicationState();
        let char = JSON.parse(await navigator.clipboard.readText())
        char.name = char.name + " " + (state.session.filter(c => c.name.replace(/\s\d$/,"") === char.name.replace(/\s\d$/,"")).length + 1)
        state.session.push(char)
        setApplicationState(state).catch((err)=>console.warn(err));
    }

    createCharacter(){
        let state = getApplicationState();
        state.session.push(this.createCharacterData());
        setApplicationState(state).catch((err)=>console.warn(err));
    }

    createCharacterData(){
        let stats = this.rollStatArray();
        let hp = roll(6) + calcBonus(stats[3])
        return {
            name : "",
            hitpoints : [hp,hp,0],
            armorClass : 10 + roll(6),
            initiative : 0,
            stats : stats,
            portrait: ""
        }
    }

    rollStatArray(){
        return [
            this.rollStats(),
            this.rollStats(),
            this.rollStats(),
            this.rollStats(),
            this.rollStats(),
            this.rollStats()
        ]
    }

    rollStats(){
        return [roll(6),roll(6),roll(6),roll(6)].sort().slice(1,4).reduce((acc,cur)=>acc+cur);
    }
}

//----------------------------
// InfoModal
//----------------------------

class InfoModal extends React.Component{
    constructor(){
        super();
        this.state = {

        }
    }
    render(){
    return <div id="myModal" className="modal" style={this.getModalCss()} onClick={this.props.closeHandler}>
        <div className="bg-light" style={this.getContentCss()} onClick={e=>e.stopPropagation()}>
            <span className="color-gray cursor-pointer" style={this.getCloseButtonCss()} onClick={this.props.closeHandler}>&times;</span>
            <div className="modal-body mt-5">
                {this.renderBody()}
            </div>
        </div>
    </div>
    }

    async componentDidMount(){          

    }

    renderBody(){
        return <div className="col-12">
            <div className="row" style={{height:"128px"}}>
                <div className="col-3">
                    {this.renderPortrait()}
                </div>
                <div className="col-9 text-left">
                    {this.renderCharacterInfo()}
                </div>
            </div>
        </div>
    }

    renderPortrait(){
        return <div className="bg-100 bg-center" style={{
                background: `url("${this.props.info.portrait}")`,
                border:"1px dashed transparent",
                height:128,
                width:128/**/
            }}
        />
    }

    renderCharacterInfo(){
        return <div className="col-12">
            <div className="row">
            <span className="color-gray">Name: {this.props.info.name}</span>
            </div>
            <div className="row">
            <span className="color-gray">Name: {this.props.info.name}</span>
            </div>
            <div className="row">
            <span className="color-gray">Name: {this.props.info.name}</span>
            </div>
        </div>
    }

  


    getModalCss(){
        return {
            "display": this.props.hidden ? "none":"block", /* Hidden by default */
            "position": "fixed", /* Stay in place */
            "z-index": "10", /* Sit on top */
            "padding-top": "10px", /* Location of the box */
            "left": "0",
            "top": "0",
            "width": "100%", /* Full width */
            "height": "100%", /* Full height */
            "overflow": "auto", /* Enable scroll if needed */
            "background-color": "rgb(0,0,0)", /* Fallback color */
            "background-color": "rgba(0,0,0,0.4)" /* Black w/ opacity */
          }
    }

    getContentCss(){
        return  {
            "margin": "auto",
            "padding": "20px",
            "border": "1px solid #888",
            "width": "80%",
            "height": "calc(100vh - 20px)",
            "overflow-y": "hidden",
            "overflow-x": "hidden"
          }
    }

    getCloseButtonCss(){
        return {
            "float": "right",
            "font-size": "28px",
            "font-weight": "bold"
        }
    }
}

//----------------------------
// Notifications
//----------------------------
class NotificationList extends React.Component{
    classList = "d-flex align-items-start flex-column bd-highlight mb-3 notification"
    styleSheet = {
        position: "fixed",
        bottom: 0,
        right: 0,
        zIndex: 9999,
    }

    constructor(){
        super();
        
    }
    render(){
        return <div id="NotificationList" className={this.classList} style={this.styleSheet}>
            <BubbleNotification error="false">Application Started</BubbleNotification>
        </div>
    }

    send(){

    }
}

NotificationList.send = function(text){
    $("#NotificationList").append(<BubbleNotification error="false">text</BubbleNotification>)
}

class BubbleNotification extends React.Component{
    classList="mr-3";
    styleSheet = {
        backgroundColor:"lightgreen",
        border: "1px solid green",
        borderRadius: "4px",
        padding: "12px",
        opacity: "1"
    };
    render(){
        return <div className={this.classList} style={this.styleSheet} ref={this.setReference.bind(this)}>
            {this.props.children}
        </div>
    }
    
    setReference(element){
        this.element = element;
    }

    componentDidMount(){
        this.fade();
    }

    fade(){
        if(!this.element) return;
        this.element.style.opacity = (Number(this.element.style.opacity || "1")-0.01).toFixed(2).toString();
        if(this.element.style.opacity === "0") this.element = undefined;
        requestAnimationFrame(this.fade.bind(this));
    }

}

//----------------------------
// Render Page
//----------------------------

ReactDOM.render(
    <Default name="Aaron"/>,
    document.getElementById("root")
);
