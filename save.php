<?php
if (isset($_POST['Graph'])) {  
	header("Content-Type: application/json");
	header("Content-Disposition: attachment; filename=".$_POST['Graph'].".vis");
	echo $_POST['Content'];
}
?>

