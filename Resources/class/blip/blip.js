/**
 * BlipApi class, extends Service class 
 * TODO make HttpConnector a class variable
 * FIXME all onSuccess and onFail callbacks should be defined outside of the class
 * definition 
 */
var Blip = new Class.create(Service,{
  initialize : function($super, login, password, service_id, api_root) {
    $super(login, password, service_id);
    console.log("api_root " + api_root);
    this.api_root = api_root || 'http://api.blip.pl';
  },
  dashboard_last_id : 0,
  bliposphere_last_id : 0,
  tag_last_id : 0,
  current_page : 0,
  include_string_user : "?include=user,recipient",
  include_string_full : "?include=user,user[avatar],recipient,recipient[avatar],pictures&limit=20",
  commonHeaders : function() {
    var self = this;
    return {
        'X-blip-api' : '0.02',
        'Accept' : 'application/json',
        'User-Agent' : Titanium.App.getName()+" "+Titanium.App.getVersion() + " ",
        "Content-Type": "application/x-www-form-urlencoded; charset=utf-8"
//        'Authorization' : 'Basic '+self.credentials
      };
  },
  dashboardGet : function(offset) {
    var self = this;
     var url = self.api_root+'/dashboard'+self.include_string_full;
    if(self.dashboard_last_id !== 0) {
       url = self.api_root+'/dashboard/since/'+self.dashboard_last_id+self.include_string_full;
    }
    if(offset >= 0) {
      url += '&offset='+(offset * interfaces[self.service_id].globalLimit);
    }
  //  else {
  //    url += '&offset=0';
  //  }
    var req = new HttpConnector(self.commonHeaders());
    req.setUserCred(self.login, self.password);
    req.get(url);
    req.onSuccess = function(status,response) {
      // handle blip.pl error after redirect - should be 503, but instead you get 302
      // and everything appears to be a-ok
      console.log(response.match(/^\[/) );
      if (response.match(/^\[/) === null) {
        self.onFail(status, response);
      } else {
        var ob = Titanium.JSON.parse(response);
        if(ob.length >0) {
          self.dashboard_last_id= ob[0].id;
          self.dashboardProcess(ob,self.dashboard_last_id);
        }
      }
    };
    req.onFail = function(status, response) {
      interfaces[self.service_id].notify('Błąd', 'Błąd połączenia z API, próbujemy dalej...', 'fail');
      console.log("błąd! " + status + "\n" + response);
      if(status == 403) self.loginFail();
    };
  },
  dashboardProcess :function(response_obj,is_update){

    interfaces[this.service_id].draw(response_obj, is_update);
  },
  afterSend :  function(response_obj){
    interfaces[this.service_id].afterSend(response_obj);
  },
  post : function(str) {
    var self = this;
    var req = new HttpConnector(self.commonHeaders());
    req.setUserCred(self.login, self.password);
    try {
      req.post(self.api_root+'/updates','update[body]='+encodeURIComponent(str));
    } catch (no_encodeuri_compononent) { console.dir(no_encodeuri_compononent); }
    req.onSuccess = function(resp) { self.afterSend(resp); };
    req.onFail = function(resp) {
      interfaces[self.service_id].notify('Błąd', 'Błąd wysyłania... ' + resp, 'fail');
      self.afterSend(resp);
    };
  
  },
  getBlip : function(blipid) {
    var self = this;
    var req = new HttpConnector(self.commonHeaders());
    req.setUserCred(self.login, self.password);
    req.get(self.api_root+'/updates/'+blipid+self.include_string_full);
    req.onSuccess = function(st, resp) {
      var obj = Titanium.JSON.parse(resp);
      interfaces[self.service_id].injectQuotedBlip(blipid,obj);
    };
    req.onFail = function(st, resp) {
      console.log(st);
      interfaces[self.service_id].notify("Błąd","Rozwijanie linka się nie powiodło", 'fail');
    };

   },
  shortenLink : function(url) {
    var self = this;
    var req = new HttpConnector(self.commonHeaders());
    req.setUserCred(self.login, self.password);
    req.post(self.api_root+'/shortlinks', 'shortlink[original_link]='+url);
    req.onSuccess = function(st, resp) {
      var obj = Titanium.JSON.parse(resp);
      interfaces[self.service_id].replaceLinks(url, obj.url);
    }; 
    req.onFail = function(st, resp) {
      interfaces[self.service_id].notify("Błąd","Tworzenie linka się nie powiodło", 'fail');
    };
  },
  expandLink : function(id) {
    var self = this;
    var req = new HttpConnector(self.commonHeaders());
    req.setUserCred(self.login, self.password);
    req.get(self.api_root+'/shortlinks/'+id);
    req.onSuccess = function(st, resp) {
      var obj = Titanium.JSON.parse(resp);
      interfaces[self.service_id].expandShortenUrl(id,obj);
    };
    req.onFail = function(st, resp) {
      console.log(st);
      interfaces[self.service_id].notify("Błąd","Rozwijanie linka się nie powiodło", 'fail');
    };
  },
  getArchive : function(resource, offset) {
    var req = new HttpConnector(this.commonHeaders());
    req.setUserCred(this.login, this.password);
    var url = this.api_root;
    url = "http://api.blip.pl";
    switch(resource) {
      case 'pm':
        url += '/private_messages';
        break;
      case 'dm':
        url += '/directed_messages';
        break;
      case 'n':
        url += '/notices';
        break;
      default:
        url += '/dashboard';
        break;
    }
    url += this.include_string_full+"&limit=10";
    if (offset) {
      url += "&offset="+offset;
    }

    req.get(url);

    var self = this;
    req.onSuccess = function(st, resp) {
      var obj = Titanium.JSON.parse(resp);
      self.onArchiveComplete(obj);
    };
    req.onFail = function(st, resp) {
      console.log('getArchive fail ' + resource);
      console.log(st); console.log(resp);
    };
  },
  onArchiveComplete : function(objects) {
    console.dir(objects);
  }

});
