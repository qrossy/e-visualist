# notes
'''
This file is for housing the main dash application.
This is where we define the various css items to fetch as well as the layout of our application.
'''

# package imports
import dash
from dash import html, dcc
import dash_bootstrap_components as dbc
from flask import Flask

# local imports
# from utils.settings import APP_DEBUG
from components import navbar, footer

server = Flask(__name__)

app = dash.Dash(
    __name__,
    server=server,
    use_pages=True,    # turn on Dash pages
    external_stylesheets=[
        dbc.themes.BOOTSTRAP,
        dbc.icons.FONT_AWESOME
    ],  # fetch the proper css items we want
    meta_tags=[
        {   # check if device is a mobile device. This is a must if you do any mobile styling
            'name': 'viewport',
            'content': 'width=device-width, initial-scale=1'
        }
    ],
    suppress_callback_exceptions=True,
    title='Dafodill'
)

def serve_layout():
    '''Define the layout of the application'''
    return html.Div(
        children=[
            dbc.Row(navbar),
            dbc.Row(
                dbc.Container(
                    dash.page_container,
                    class_name='main'
                ),
            ),
            dbc.Row(footer),
            dcc.Store(id='user-data', storage_type='session'),
        ]
    )

app.layout = serve_layout   # set the layout to the serve_layout function
server = app.server         # the server is needed to deploy the application

if __name__ == "__main__":
    app.run_server(
        debug=True,
        # host=APP_HOST,
        # port=APP_PORT,
        # dev_tools_props_check=DEV_TOOLS_PROPS_CHECK
    )
