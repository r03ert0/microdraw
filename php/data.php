<?php
if(isset($_POST["s"]))
	$src=$_POST["s"];
else if(isset($_GET["s"]))
	$src=$_GET["s"];

$text=file_get_contents($_SERVER['DOCUMENT_ROOT'].$src);
$json=json_decode($text);
for($i=0;$i<count($json->tileSources);$i++) {
	$path=$_SERVER['DOCUMENT_ROOT']."/".$json->tileSources[$i];
	$xml=file_get_contents($path);
	var_dump($xml);
}

/*echo "f(".$json.");";*/

?>