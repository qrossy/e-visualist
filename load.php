<?php
if (isset($_FILES['File']['tmp_name'])) {  
	$content = file_get_contents($_FILES['File']['tmp_name']);
	echo '<script language="javascript" type="text/javascript">';
	echo 'window.top.window.Interface.get().load('.json_encode(json_decode($content)).')';
	echo '</script>'; 
}
?>