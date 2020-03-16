from flask import request, Flask, Blueprint, render_template, redirect, jsonify


# If `entrypoint` is not defined in app.yaml, App Engine will look for an app
# called `app` in `main.py`.
app = Flask(__name__)


@app.route('/privacypolicy/')
def privacypolicy():
    return render_template("privacy.html", 
                           company_name = "Gantt Sheet",
                           last_updated_date = "March-16-2020",
                           retention_period_string = "30 days",
                           contact_email = "sri.panyam@gmail.com")

@app.route('/')
def hello():
    return """
    <html>
    <head>
    <meta name="google-site-verification" content="qjDR1BNq93z_ld7Wpufa1oPKTVOzeDYaI8eeCM0WE30" />
    <title>Gantt Sheets</title>
    </head>
    <body>
        <center><h1>Gantt Sheets</h1></center>
    </body>
    </html>
    """


if __name__ == '__main__':
    # This is used when running locally only. When deploying to Google App
    # Engine, a webserver process such as Gunicorn will serve the app. This
    # can be configured by adding an `entrypoint` to app.yaml.
    app.run(host='127.0.0.1', port=8080, debug=True)
