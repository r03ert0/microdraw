<?php

error_reporting(E_ALL);
ini_set('display_errors', 'On');

include $_SERVER['DOCUMENT_ROOT']."/microdraw/php/base.php";
$connection=mysqli_connect($dbhost, $dbuser, $dbpass,$dbname) or die("MySQL Error 1: " . mysql_error());

if(isset($_GET["action"])) $action=$_GET;
if(isset($_POST["action"])) $action=$_POST;

switch($action["action"])
{
	case "save":
		save($action);
		break;
	case "load":
		load($action);
		break;
	case "load_last":
		loadLast($action);
		break;
	case "remote_address":
		remote_address();
		break;
}

function save($args)
{
	global $connection;
	global $dbname;
	
	header("Access-Control-Allow-Origin: *");

	$q="INSERT INTO ".$dbname.".KeyValue (myOrigin, myKey, myValue) VALUES('"
		.$args["origin"]."','"
		.$args["key"]."','"
		.mysqli_real_escape_string($connection,$args["value"])."')";
	$result = mysqli_query($connection,$q);

	header('Content-Type: application/json');
	if($result) {
		$response["result"]="success";
	} else {
		$response["result"]="error";
		$response["description"]=mysqli_error($connection);
	}
	echo json_encode($response);
}

function load($args)
{
	global $connection;
	global $dbname;
	$arr=array();
	
	header("Access-Control-Allow-Origin: *");
	
	$q="SELECT * FROM ".$dbname.".KeyValue WHERE "
		." myOrigin = '".$args["origin"]."' AND"
		." myKey = '".$args["key"]."'";
	$result = mysqli_query($connection,$q);

	while($row = mysqli_fetch_assoc($result)) {
		if($row["myValue"])
		{
			//$row["myValue"]=json_decode($row["myValue"]);
			array_push($arr,$row);
		}
	}

	header('Content-Type: application/text');
	echo json_encode($arr);

	mysqli_free_result($result);
}
function loadLast($args)
{
	global $connection;
	global $dbname;
	
	header("Access-Control-Allow-Origin: *");
	
	$q="SELECT * FROM ".$dbname.".KeyValue WHERE "
		." myOrigin = '".$args["origin"]."' AND"
		." myKey = '".$args["key"]."'"
		." ORDER BY myTimestamp DESC LIMIT 1";
	$result = mysqli_query($connection,$q);
	if(mysqli_num_rows($result)>0) {
		header('Content-Type: application/text');
		$row = mysqli_fetch_assoc($result);
		echo json_encode($row);
	}
	mysqli_free_result($result);
}
function remote_address()
{
	header("Access-Control-Allow-Origin: *");

	echo $_SERVER['REMOTE_ADDR'];
}
?>