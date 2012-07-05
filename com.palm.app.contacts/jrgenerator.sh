#!/bin/bash

# ##############################################################################
# <jasminerunner.html Generator>
#
# Place in:
#	/project-name/trunk/
#
# Make file runnable: 
# 	chmod u+x jrgenerator.sh
#
# If you have the suggested setup:
#	./jrgenerator.sh
#
# If your enyo and jasmine source files are located elsewhere:
# 	./jrgenerator.sh [path-to-jasmine-directory path-to-enyo.js]
# For example:
#	./jrgenerator.sh ../../jasmine ../../enyo/0.10/framework/enyo.js
#
# ##############################################################################


echo ''
echo '<jasminerunner.html Generator>'
echo ''

jasminefile='jasminerunner.html'
jasminetestsdir='tests'

if [ "${1}" = '' ] ; then
	jasminelocation='../../jasmine'
else
	jasminelocation=${1}
fi

if [ "${2}" = '' ] ; then
	enyolocation='../../enyo/0.10/framework/enyo.js'
else
	enyolocation=${2}
fi

# First portion of file
html1=$(cat <<EOF
<!doctype html>
<html>
<head>
	<title>Jasmine Test Runner</title>

	<!-- MODIFY ACCORDINGLY TO *LOCAL* ENYO SOURCE FILE -->	
	<script type="text/javascript" src="${enyolocation}"></script>
	
	<!-- MODIFY ACCORDINGLY TO *LOCAL* JASMINE SOURCE FILES -->
	<link rel="stylesheet" type="text/css" href="${jasminelocation}/jasmine.css">
	<script type="text/javascript" src="${jasminelocation}/jasmine.js"></script>
	<script type="text/javascript" src="${jasminelocation}/jasmine-html.js"></script>
	
	<!-- INCLUDE ALL SPEC FILES HERE -->
EOF
)

# Second portion of file: spec files
if [ -d ${jasminetestsdir} ] ; then
	cd ${jasminetestsdir}
	for jsfile in `find . -name '*.js'` ; do
		filename=`basename ${jsfile}`
		html2=${html2}$(cat <<EOF
	
	<script type="text/javascript" src="${jasminetestsdir}/${filename}"></script>
EOF
	)
	done
	cd ..
else
	mkdir ${jasminetestsdir}
	echo "Please move your spec files into <${jasminetestsdir}> and rerun this script"
fi

# Third portion of file
html3=$(cat <<EOF

</head>

<body>
	<script type="text/javascript">
	jasmine.getEnv().addReporter(new jasmine.TrivialReporter());
		jasmine.getEnv().execute();
	</script>
</body>
</html>
EOF
)

echo "${html1}${html2}${html3}" > ${jasminefile}