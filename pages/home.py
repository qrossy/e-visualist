# package imports
import dash
from dash import html, dcc, callback, Input, Output
import dash_bootstrap_components as dbc

# local imports
from components import sidebar
from input.layout import inputLayout

dash.register_page(
    __name__,
    path='/',
    title='Home'
)

layout = html.Div(
    [
        dbc.Row([
            sidebar,
            dbc.Col(
                dbc.Tabs(
                    [
                        dbc.Tab(inputLayout, label="Data", tab_id="data"),
                        dbc.Tab(label="Graph", tab_id="graph"),
                    ],
                    id="main-tabs",
                    active_tab="data",
                ),
            ),
        ]
        ),
    ]
)