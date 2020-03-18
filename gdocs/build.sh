#!/usr/bin/env bash

set -e

dist_dir="dist"
mkdir -p ${dist_dir}/server
mkdir -p ${dist_dir}/client

server () {
    cp project/appsscript.json ${dist_dir}
    cp project/server/*.js ${dist_dir}/server
}

client () {
    cp project/client/*.html ${dist_dir}/client
}

js () {
    echo "JS Done"
}

css () {
    echo "CSS Done"
}

js2 () {
    # wrap bundled js in script tags and rename as html
    input_file="project/client/sidebar.js"
    output_file="${dist_dir}/client/bundle.min.js.html"
    echo "<script>" > ${output_file}
    browserify -t 'uglifyify' ${input_file} | uglifyjs >> ${output_file}
    echo "</script>" >> ${output_file}
}

css2 () {
    output_file="${dist_dir}/client/styles.html"

    optimizations="optimizeBackground:off;"
    optimizations+="replaceMultipleZeros:off;"
    optimizations+="specialComments:off"

    # wrap all theme css in style tags and bundle into html
    echo "<html>" > ${output_file}
    for filename in node_modules/highlight.js/styles/*.css; do
        theme_name=$(basename "${filename}" .css)
        if [[ ${theme_name} != 'darkula' ]]; then
            theme="<style id=\"${theme_name}\">"
            theme+=$(cleancss --debug -O1 ${optimizations} "${filename}")
            theme+="</style>"
            echo ${theme} >> ${output_file}
        fi
    done
    echo "</html>" >> ${output_file}
}

case "$1" in
    "server")    server;;
    "client")    client;;
    *)
        echo "invalid command: $1"
        exit 1
        ;;
esac
