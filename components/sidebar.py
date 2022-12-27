# notes
'''
This file is for creating a navigation bar that will sit at the top of your application.
Much of this page is pulled directly from the Dash Bootstrap Components documentation linked below:
https://dash-bootstrap-components.opensource.faculty.ai/examples/simple-sidebar/
'''

# package imports
from dash import html, dcc
import dash_bootstrap_components as dbc
from dash_iconify import DashIconify

# local imports
import input.load_file as load_file

# the style arguments for the sidebar
SIDEBAR_STYLE = {
    "backgroundColor": "#f8f9fa",
}

# Components



## Main Bar
sidebar = dbc.Col(
    dbc.Tabs(
        [
            dbc.Tab(load_file.tab_import, 
                label = "Import", 
                tab_id = "import",
                style = {'paddingLeft': '12px'},
            ),
            dbc.Tab(label="Create", tab_id="create"),
            dbc.Tab(label="Edit", tab_id="edit"),
        ],
        id="sidebar-tabs",
        active_tab="import",
    ),
    style=SIDEBAR_STYLE,
    width=3,
)
