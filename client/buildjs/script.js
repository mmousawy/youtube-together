class HostController{constructor(e){this.player=e,this.player.addEventListener("onReady",this.ready),this.player.addEventListener("onStateChange",this.stateChange)}ready(){}stateChange(){}}class GuestController{constructor(e){this.player=e,this.player.addEventListener("onReady",this.ready),this.player.addEventListener("onStateChange",this.stateChange)}ready(){}stateChange(){}}!function(){const e=document.createElement("script");e.src="https://www.youtube.com/iframe_api",document.body.appendChild(e),window.onYouTubeIframeAPIReady=(()=>{let e=new YT.Player("player",{width:1280,height:720});new HostController(e)})}();