/**
 *	project:
 *		USING FRAMEWORK
 *	version:
 *		0.0.3
 *	date:
 *		2013-08-10
 *	author:
 *		Oscar Johansson / Klimtachakka
 *	description:
 *		Lightweight framework for one class one file Philosophy
 *	uage:
 *		using(
 *		-optional name parameter-,
 *		-optional [array, of, class, imports]-,
 *		-required functionBody(parameters, of, class, imports){
 *			function ClassName(){
 *				//constructor
 *			}
 *			return ClassName;
 *		});
 *	requirements:
 *		UsingFW.js and Bootstrapper.js must be added in main html page.
 *
 **/


//constructor

function UsingFW() {
	this.instantiatedClasses = {};
	this.reset();
}

// set to true if running a compiled file
UsingFW.prototype.COMPILED = false;


/* @description reset also acts as an initializer
 * @returns void
 */
UsingFW.prototype.reset = function() {
	this.classHash = {};
	this.classContainers = {};
	this.pendingClasses = 0;
	this.BOOTSTRAPPER = 'Bootstrapper';
	this.loadingClass = this.BOOTSTRAPPER;
	this.loadQeue = [];
	this.shortHands = {};
};

/*
 * @description scope bind util function, if no args array is passed it uses the calling functions args
 * @param {function} function to scope
 * @param {scope} scope
 * @param {Array} array with params
 * @returns {function}
 */
UsingFW.prototype.bind = function(functionBody, scope, args) {
	return function() {
		functionBody.apply(scope, args || arguments);
	};
};

//minimal setup of console log, needs to be activated externally
UsingFW.prototype.console = {};
UsingFW.prototype.console.__ufwlog = function() {
	if (UsingFW.console.out && UsingFW.console.BOOT_FILTER) {
		UsingFW.console.out(UsingFW.console.BOOT_FILTER, arguments);
	}
};


/*
 * @description prepare classes and run application
 * @returns {void}
 */
UsingFW.prototype.boot = function() {
	if (this.prepareClasses()) {
		UsingFW.console.__ufwlog('RUNNING APP FROM RUNTIME');
		this.runApp();
	} else {
		UsingFW.console.__ufwlog('Something went terribly wrong..');
	}
};


/*
 * @description helper function for detection of instantiated classes
 * @param {hash} hash of all instantiated classes
 * @param {ClassContainer} container with class specific values
 * @returns {boolean} if all dependencies of the supplied classContainer are instantiated it will return true
 */
UsingFW.prototype.checkDependencies = function(instantiatedClasses, classContainer) {
	var len = classContainer.classPaths.length;
	for (var i = 0; i < len; i++) {
		var classPath = classContainer.classPaths[i];
		if (!instantiatedClasses[classPath]) {
			UsingFW.console.__ufwlog('not instantiated yet : > ' + classPath);
			return false;
		}
	}
	return true;
};


/*
 * @description gets all classes except the bootstrapper as an array
 * @returns {array}
 */
UsingFW.prototype.getClassContainersAsList = function() {
	var classContainers = this.classContainers;
	var classContainersList = [];
	for (var key in classContainers) {
		if (classContainers.hasOwnProperty(key) && key !== this.BOOTSTRAPPER) {
			classContainer = classContainers[key];
			classContainersList.push(classContainer);
		}
	}
	return classContainersList;
};


/*
 * @description prepares classes for instantiation
 * @returns {boolean} returns true if no Error occured
 */
UsingFW.prototype.prepareClasses = function() {

	UsingFW.console.__ufwlog('_________preparing loaded classes_______');

	var classContainer = {};
	var classContainersList = this.getClassContainersAsList();
	var tMax = classContainersList.length + 1;

	var t = 0;
	while (classContainersList.length > 0 && t < tMax) {
		t++;

		for (var c = 0; c < classContainersList.length; c++) {
			classContainer = classContainersList[c];

			if (classContainer.classPaths.length === 0 || this.checkDependencies(this.instantiatedClasses, classContainer)) {

				this.createClass(classContainer);
				classContainersList.splice(c, 1);
				c--;
			}
		}
	}

	if (classContainersList.length > 0) {
		UsingFW.console.__ufwlog('not instantiated : ', classContainersList[0]);

		return false;
	}
	return true;
};


/*
 * @description creates a class with it's required dependencies
 * @param {ClassContainer} instantiates the supplied classContainer
 * @returns {boolean} returns true if no Error occured
 */
UsingFW.prototype.createClass = function(classContainer) {

	var len = classContainer.classPaths.length;
	var params = [];
	for (var i = 0; i < len; i++) {
		params.push(this.instantiatedClasses[classContainer.classPaths[i]]);
	}
	UsingFW.console.__ufwlog('creating ' + classContainer.className, params);
	this.instantiatedClasses[classContainer.className] = classContainer.classReference.apply(this, params);
	this.instantiatedClasses[classContainer.className].className = classContainer.explicitClassName; //not so useful?

};


/*
 * @description creating and running the bootstrapper , aka, starting the application
 * @returns {void}
 */
UsingFW.prototype.runApp = function() {

	var bootStrapper = this.classContainers[this.BOOTSTRAPPER];
	if (bootStrapper) {
		this.createClass(bootStrapper);
		this.instantiatedClasses[this.BOOTSTRAPPER].apply(bootStrapper.classReference);
		this.reset();
	} else {
		UsingFW.console.__ufwlog('Missing app class, compiled state:' + this.COMPILED);
	}
};


/*
 * @description checks if there are no more pending classes, and if so, it starts the boot process
 * @param {string} classPath , src to the class just loaded
 * @returns {void}
 */
UsingFW.prototype.classLoadedHandler = function(classPath) {

	UsingFW.pendingClasses--;
	UsingFW.console.__ufwlog('just loaded : ', classPath);
	if (UsingFW.pendingClasses === 0) {
		UsingFW.console.__ufwlog('all classes loaded.');
		this.boot();
	}
};


/*
 * @description getting unadded imported classes from the classcontainer and adds them in the loadqeue
 * @param {ClassContainer} gets the classpaths from the classcontainer and adds the in the loadQeue
 * @returns {void}
 */
UsingFW.prototype.addClassesToQeue = function(classContainer) {

	var classPaths = classContainer.classPaths;
	var className = classContainer.className;
	len = classPaths.length;

	for (var j = 0; j < len; j++) {
		var classPath = UsingFW.detectShim(classPaths[j]);
		classPaths[j] = classPath;

		if (!UsingFW.classHash[classPath]) {
			UsingFW.classHash[classPath] = true;

			//simpleClassContainer
			var simpleClassContainer = {
				classPath: classPath,
				className: className
			};
			UsingFW.loadQeue.push(simpleClassContainer);
		}
	}
};

/*
 * @description helper for detecting if a path is containing a shim/path
 * @param {string} checks if the classPath contains a shortHand
 * @returns {string} new modified classPath
 */
UsingFW.prototype.detectShim = function(classPath) {
	var shortHandPartFirst = classPath.split('/')[0];
	var shortHandPartLast = classPath.split('/')[1];
	if (UsingFW.shortHands[shortHandPartFirst]) {
		return UsingFW.shortHands[shortHandPartFirst] + '/' + shortHandPartLast;
	}
	return classPath;
};


/*
 * @description loads a single class - single threaded
 * @param {simpleClassContainer} lighter version of ClassContainer
 * @returns {void}
 */
UsingFW.prototype.loadSingleClass = function(simpleClassContainer) {
	var classPath = simpleClassContainer.classPath;
	var className = simpleClassContainer.className;

	UsingFW.loadingClass = classPath;
	UsingFW.pendingClasses++;
	if (UsingFW.COMPILED) {
		UsingFW.console.log('> *load : ' + classPath + '.js');
		UsingFW.classLoadedHandler.apply(UsingFW, [classPath, className]);
	} else {
		var head = document.getElementsByTagName('head')[0];
		var script = document.createElement('script');
		script.onload = UsingFW.bind(UsingFW.classLoadedHandler, UsingFW, [classPath]);
		script.type = 'text/javascript';
		script.src = classPath + '.js';
		head.appendChild(script);
	}
};


/*
 * @description global function that all classes call
 * @param {arguments} since the parameters can be omitted it uses the native arguments array and does typechecking
 * @returns {void}
 */
window.using = function() {

	var explicitClassName = "n/a";
	var classPaths = [];
	var classReference = {};

	for (var key in arguments) {
		var param = arguments[key];
		switch (typeof(param)) {
			case 'object':
				classPaths = param;
				break;
			case 'function':
				classReference = param;
				break;
			case 'string':
				explicitClassName = param;
				break;
			default:
				UsingFW.__ufwlog('unknown param @ window.using', param);
				break;
		}
	}

	//ClassContainer
	var classContainer = {
		explicitClassName: explicitClassName,
		className: UsingFW.loadingClass,
		classPaths: classPaths,
		classReference: classReference
	};

	UsingFW.classContainers[UsingFW.loadingClass] = classContainer;
	UsingFW.addClassesToQeue(classContainer);
	if (UsingFW.loadQeue.length > 0) {
		UsingFW.loadSingleClass(UsingFW.loadQeue.pop());
	}
};

//getting shit done
window.UsingFW = new UsingFW();