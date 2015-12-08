SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

CREATE TABLE IF NOT EXISTS `KeyValue` (
  `UniqueID` int(11) NOT NULL AUTO_INCREMENT,
  `myTimestamp` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `myOrigin` text COLLATE utf8_bin NOT NULL,
  `myKey` text COLLATE utf8_bin NOT NULL,
  `myValue` text COLLATE utf8_bin NOT NULL,
  PRIMARY KEY (`UniqueID`),
  UNIQUE KEY `UniqueID` (`UniqueID`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 COLLATE=utf8_bin AUTO_INCREMENT=100 ;

