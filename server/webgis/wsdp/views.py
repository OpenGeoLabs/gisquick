import os
import time
import json

from django.http import Http404, HttpResponse
from django.conf import settings

from zeep import Client
from zeep.wsse.username import UsernameToken


wsdl_url = 'https://katastr.cuzk.cz:443/ws/wsdp/2.8/sestavy?wsdl'
# wsdl_url = "https://wsdptrial.cuzk.cz/trial/ws/wsdp/2.8/sestavy?wsdl"


def lv(request, lv_id=None):
    project = request.GET.get("project")
    if not project:
        raise Http404

    project_dir = os.path.join(settings.GISQUICK_PROJECT_ROOT, *project.split(os.path.sep)[:2])
    try:
        with open(os.path.join(project_dir, '.wsdp.json')) as f:
            credentials = json.load(f)
            login = credentials["login"]
            password = credentials["password"]
    except FileNotFoundError:
        raise Http404

    client = Client(wsdl_url, wsse=UsernameToken(login, password))
    resp = client.service.generujLV(lvId=lv_id, format="pdf")
    try:
        id_sestavy = resp["reportList"]["report"][0]["id"]
    except (KeyError, TypeError):
        raise Http404

    respdf = client.service.seznamSestav(idSestavy=id_sestavy)
    while respdf["reportList"]["report"][0]["stav"] != "zpracován":
        time.sleep(5)
        respdf = client.service.seznamSestav(idSestavy=id_sestavy)

    respdf = client.service.vratSestavu(idSestavy=id_sestavy)
    return HttpResponse(respdf["reportList"]["report"][0]["souborSestavy"], content_type="application/pdf")
