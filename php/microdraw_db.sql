SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

CREATE TABLE IF NOT EXISTS `KeyValue` (
  `myTimestamp` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `myOrigin` text COLLATE utf8_bin NOT NULL,
  `myKey` text COLLATE utf8_bin NOT NULL,
  `myValue` text COLLATE utf8_bin NOT NULL,
  UNIQUE KEY `myTimestamp` (`myTimestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;
