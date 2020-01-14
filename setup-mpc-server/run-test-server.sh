#!/bin/bash
(
sleep 3
SIG="X-Signature:0x57d537ce2418c6e4ffcdf1452d90c35a44bbfdd1ba4356ea09ec1cd4a1bfb97c5e1967f784b51694585f726c205121f68ddddef7aec6316ccc3356dc5cd9ced61b"
CT="Content-Type:application/json;charset=utf-8"
curl -X POST -i -H $CT -H $SIG -X POST http://localhost:8081/api/reset -d "$(cat <<EOF
{
	"startTime": 10,
	"endTime": 60,
	"selectBlock": -1,
	"invalidateAfter": 7600,
	"numG1Points": 1008000,
	"numG2Points": 1,
	"pointsPerTranscript": 50400,
	"maxTier2": 5,
	"minParticipants": 2,
	"participants0": [
		"0x405b42dDb31d3250087B230407250b2Cf9050971",
		"0xA5f146eCb90A624de0433530634566313758f924",
		"0x1aA18F5b595d87CC2C66d7b93367d8beabE203bB"
	]
}
EOF
)"
) &
docker run -p 8081:80 setup-mpc-server:latest