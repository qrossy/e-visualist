<!DOCTYPE html>
<html>
	<head>
		<!-- php -S 0.0.0.0:8000 -->
		<meta http-equiv="Content-type" content="text/html; charset=utf-8" />
		<title>Visualist | HTML Test</title>

		<script type="text/javascript" src="api/timeline_js/timeline-api.js?bundle=true"></script>
		<script>SimileAjax.History.enabled = false;</script>

    	<script type="text/javascript" src="api/d3.V3.min.js"></script>
		<script type="text/javascript" src="api/path-data-polyfill.js"></script>

		<script type="text/javascript" src="api/jquery/jquery-3.6.2.min.js"></script>
		<script type="text/javascript" src="api/jquery/jquery-ui.min.js"></script>
		<script type="text/javascript" src="api/jquery/jquery.layout-latest.js"></script>
		<script type="text/javascript" src="api/jquery/jquery.fonticonpicker.min.js"></script>
		
		<script type="text/javascript" src="api/tinymce/tinymce.min.js"></script>
		<script type="text/javascript" src="api/tinymce/jquery.tinymce.min.js"></script>

		<script type="text/javascript" src="js/utils.js"></script>
		<script type="text/javascript" src="js/actions.js"></script>
		<script type="text/javascript" src="js/controller.js"></script>
		<script type="text/javascript" src="js/entity.js"></script>
		<script type="text/javascript" src="js/graph.js"></script>

		<script type="text/javascript" src="js/event/event.js"></script>
		<script type="text/javascript" src="js/event/graphEvent.js"></script>
		<script type="text/javascript" src="js/event/nodeEvent.js"></script>
		<script type="text/javascript" src="js/event/linkEvent.js"></script>
		<script type="text/javascript" src="js/event/boxEvent.js"></script>
		<script type="text/javascript" src="js/event/selectorEvent.js"></script>

		<script type="text/javascript" src="js/ui/interface.js"></script>
		<script type="text/javascript" src="js/ui/controls.js"></script>

		<script type="text/javascript" src="js/renderer/label.js"></script>
		<script type="text/javascript" src="js/renderer/node.js"></script>
		<script type="text/javascript" src="js/renderer/link.js"></script>
		<script type="text/javascript" src="js/renderer/box.js"></script>
		<script type="text/javascript" src="js/renderer/polygon.js"></script>
		<script type="text/javascript" src="js/renderer/selector.js"></script>

		<link type="text/css" rel="stylesheet" href="css/jquery-ui.min.css" />
		<link type="text/css" rel="stylesheet" href="css/jquery-ui.structure.min.css" />
		<link type="text/css" rel="stylesheet" href="css/jquery-ui.theme.min.css" />
		<link type="text/css" rel="stylesheet" href="css/tinymce.css" />
		<link type="text/css" rel="stylesheet" href="css/app.css" />

		<?php

			function ScanDirectory($Directory){
				$myArray = array();

				$MyDirectory = opendir($Directory);
				while($Entry = @readdir($MyDirectory)) {
					if ($Entry == '.svn' || $Entry == '.' || $Entry == '..' || is_dir($Directory.'/'.$Entry) || substr($Entry, 0, 1) == '.'){
					}
					else {
						array_push($myArray, $Entry);
					}
				}
				closedir($MyDirectory);
				return $myArray;
			}

			$icons = array();
			$Dir = opendir('img');
			while($Folder = @readdir($Dir)) {
				if ($Folder != '.svn' && $Folder != '.' && $Folder != '..' && is_dir('img/'.$Folder)){
					$icons[$Folder] = ScanDirectory('img/'.$Folder);
				}
			}
			closedir($Dir);
			echo "
		<SCRIPT type='text/javascript'>
		// var myEvent = window.attachEvent || window.addEventListener;
    // var chkevent = window.attachEvent ? 'onbeforeunload' : 'beforeunload'; /// make IE7, IE8 compatable
    //
  	// myEvent(chkevent, function(e) { // For >=IE7, Chrome, Firefox
    // 	var confirmationMessage = 'Are you sure ? You will lost all data.';  // a space
    // 	(e || window.event).returnValue = confirmationMessage;
		// 	log('test');
    // 	return confirmationMessage;
    // });

		$(document).ready(function () {
			main = Interface.get();
			Interface.icons = ".json_encode($icons).";
			main.init();
			$('body').layout({
				applyDefaultStyles: true,
				west__onresize: function () { $('#west-accordion').accordion('refresh'); },
				center__onresize: function () { Interface.get().onWindowSizeChanged(); },
				});
			$('#west-accordion').accordion('refresh');
			var g = new Graph();
			main.currentGraph = g;
            $( '<li><a href=#graph_'+g.id+'>NewGraph::'+g.id+'</a></li>' ).appendTo( '.center-tabs .ui-tabs-nav' );
            $( '.center-tabs' ).tabs( 'refresh' );
            $( '<div id=graph_'+g.id+'></div>' ).appendTo( '.center-tabs' );

			$('#graph_'+g.id).data('data', g);
			g.init();
			Interface.get().onWindowSizeChanged();
		});

		</SCRIPT>"
		?>
	</head>
	<body height="100%">

	<DIV class="ui-layout-center"></DIV>
	<DIV class="ui-layout-north"></DIV>
	<DIV class="ui-layout-south"></DIV>
	<DIV class="ui-layout-east"></DIV>
	<DIV class="ui-layout-west"></DIV>
	</body>
</html>
